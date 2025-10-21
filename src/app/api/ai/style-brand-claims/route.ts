import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';
import type { StyledClaims } from '@/types/claims';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { formatClaimsDirectly } from '@/lib/claims-formatter';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { getStackedClaimsForProduct } from '@/lib/claims-utils';
import { ok, fail } from '@/lib/http/response';
import { logDebug, logError } from '@/lib/logger';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { logAiUsage } from '@/lib/audit/ai';

type Claim = {
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

function countStyledClaims(styled: StyledClaims): number {
  return styled.grouped_claims.reduce(
    (total, group) => total + group.allowed_claims.length + group.disallowed_claims.length,
    0
  );
}

// Function to fetch all claims related to a master claim brand
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | undefined, countryCode: string | undefined): Promise<Claim[]> {
  const { data, error } = await supabase.rpc('get_all_claims_for_master_brand' as never, {
    master_brand_id_param: masterClaimBrandId,
    product_id_param: productId,
    country_code_param: countryCode
  } as never);

  if (error) {
    console.error('Error fetching all brand claims:', error);
    throw new Error('Failed to fetch claims for the brand.');
  }

  return data as Claim[];
}

// Custom sort function for claims
function sortClaims(a: Claim, b: Claim): number {
  // 1. Level order: product > ingredient > brand
  const levelOrder = { product: 1, ingredient: 2, brand: 3 };
  const aLevel = levelOrder[a.level];
  const bLevel = levelOrder[b.level];
  if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }

  // 2. Market specificity: specific market > global
  const aIsGlobal = a.country_code === GLOBAL_CLAIM_COUNTRY_CODE;
  const bIsGlobal = b.country_code === GLOBAL_CLAIM_COUNTRY_CODE;
  if (aIsGlobal !== bIsGlobal) {
    return aIsGlobal ? 1 : -1;
  }

  return 0;
}

async function styleBrandClaimsHandler(request: NextRequest, user: User) {
  let requestPayloadSize = 0;
  let effectiveBrandId: string | null = null;
  try {
    const body = await request.json();
    requestPayloadSize = JSON.stringify(body).length;
    const { masterClaimBrandId, productId, countryCode } = body;

    if (!masterClaimBrandId || typeof masterClaimBrandId !== 'string') {
      return fail(400, 'Master Claim Brand ID must be a string.');
    }
    
    const supabase = createSupabaseAdminClient();

    const { data: masterBrand, error: masterBrandError } = await supabase
      .from('master_claim_brands')
      .select('id, name, mixerai_brand_id')
      .eq('id', masterClaimBrandId)
      .single();

    if (masterBrandError || !masterBrand) {
      return fail(404, 'Master claim brand not found.');
    }

    if (masterBrand.mixerai_brand_id) {
      effectiveBrandId = masterBrand.mixerai_brand_id;
      try {
        await requireBrandAccess(supabase, user, masterBrand.mixerai_brand_id);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return fail(500, 'Unable to verify brand permissions at this time.', error.message);
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          return fail(403, 'You do not have permission to view claims for this brand.');
        }
        throw error;
      }
    } else if (user.user_metadata?.role !== 'admin') {
      return fail(403, 'This master brand is not linked to a MixerAI brand. Contact an administrator to complete setup.');
    }

    // If productId and countryCode are provided, reuse stacked claims for precedence consistency
    if (productId && countryCode) {
      const { data: productRecord, error: productError } = await supabase
        .from('products')
        .select('id, master_brand_id')
        .eq('id', productId)
        .single();

      if (productError || !productRecord) {
        return fail(404, 'Product not found.');
      }

      if (productRecord.master_brand_id !== masterClaimBrandId) {
        return fail(400, 'The provided product does not belong to the supplied master claim brand.');
      }

      const effective = await getStackedClaimsForProduct(productId, countryCode);
      const formatted = formatClaimsDirectly(
        effective.map((ec, idx) => ({
          id: `${ec.claim_text}_${idx}`,
          claim_text: ec.claim_text,
          claim_type: ec.final_claim_type === 'none' ? 'disallowed' : (ec.final_claim_type as 'allowed'|'disallowed'),
          level: (ec.source_level || 'none').toString().replace(/^./, c => c.toUpperCase()),
          country_code: ec.original_claim_country_code || countryCode,
          priority: effective.length - idx,
        })),
        undefined,
        masterBrand.name
      );
      await logAiUsage({
        action: 'ai_style_brand_claims',
        userId: user.id,
        brandId: effectiveBrandId,
        inputCharCount: requestPayloadSize,
        metadata: {
          branch: 'stacked',
          styledClaimCount: countStyledClaims(formatted),
          rawClaimCount: effective.length,
          productId,
          countryCode,
        },
      });
      return ok({ brandName: masterBrand.name || 'Unknown Brand', styledClaims: formatted, rawClaimsForAI: effective.map(ec => ({ text: ec.claim_text, type: ec.final_claim_type, level: ec.source_level, market: ec.original_claim_country_code })) });
    }

    // 1. Fetch all claims (brand-oriented)
    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, countryCode);

    if (allClaims.length === 0) {
      const { data: brandData } = await supabase.from('master_claim_brands').select('name').eq('id', masterClaimBrandId).single();
      await logAiUsage({
        action: 'ai_style_brand_claims',
        userId: user.id,
        brandId: effectiveBrandId,
        inputCharCount: requestPayloadSize,
        metadata: {
          branch: 'no-claims',
          styledClaimCount: 0,
          rawClaimCount: 0,
        },
      });
      return ok({ brandName: brandData?.name || 'Unknown Brand', styledClaims: [], rawClaimsForAI: [] });
    }

    // 2. Sort claims to establish precedence
    const sortedClaims = allClaims.sort(sortClaims);

    // 3. Use all claims without deduplication to preserve exact database values
    // Note: Keeping all claims as requested in issue #107
    const allClaimsToDisplay = sortedClaims;

    // Get brand and product names for the introductory sentence
    let productName: string | undefined;
    if (productId) {
      const { data: productData } = await supabase
        .from('products')
        .select('name, master_brand_id')
        .eq('id', productId)
        .single();
      if (productData && productData.master_brand_id !== masterClaimBrandId) {
        return fail(400, 'The provided product does not belong to the supplied master claim brand.');
      }
      productName = productData?.name;
    }

    // Format claims directly without AI
    const formattedClaims = formatClaimsDirectly(
      allClaimsToDisplay.map(claim => ({
        id: claim.claim_text, // Use text as ID since we don't have actual IDs
        claim_text: claim.claim_text,
        claim_type: claim.claim_type,
        level: claim.level.charAt(0).toUpperCase() + claim.level.slice(1), // Capitalize level
        country_code: claim.country_code,
        priority: 0 // No priority info in current structure
      })),
      productName,
      masterBrand.name
    );

    // Log for debugging
    logDebug('Formatted claims without AI:', {
      brandName: masterBrand.name,
      productName,
      totalClaims: allClaimsToDisplay.length
    });

    await logAiUsage({
      action: 'ai_style_brand_claims',
      userId: user.id,
      brandId: effectiveBrandId,
      inputCharCount: requestPayloadSize,
      metadata: {
        branch: 'brand-level',
        styledClaimCount: countStyledClaims(formattedClaims),
        rawClaimCount: allClaimsToDisplay.length,
        productId,
        countryCode,
      },
    });

    return ok({
      brandName: masterBrand.name || 'Unknown Brand',
      styledClaims: formattedClaims,
      rawClaimsForAI: allClaimsToDisplay.map(claim => ({
        text: claim.claim_text,
        type: claim.claim_type,
        level: claim.level,
        market: claim.country_code
      }))
    });

  } catch (error: unknown) {
    logError('Error in /api/ai/style-brand-claims handler:', error);
    try {
      await logAiUsage({
        action: 'ai_style_brand_claims',
        userId: user.id,
        brandId: effectiveBrandId,
        inputCharCount: requestPayloadSize,
        status: 'error',
        errorMessage: 'Failed to style brand claims',
        metadata: {
          cause: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (auditError) {
      logError('Failed to log AI usage for style-brand-claims', auditError);
      return fail(500, 'Failed to record AI usage event');
    }
    return fail(500, 'Failed to style brand claims', error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

export const POST = withAuthAndCSRF(styleBrandClaimsHandler); 
