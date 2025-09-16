import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { formatClaimsDirectly } from '@/lib/claims-formatter';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { getStackedClaimsForProduct } from '@/lib/claims-utils';
import { ok, fail } from '@/lib/http/response';
import { logDebug, logError } from '@/lib/logger';

type Claim = {
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

// Function to fetch all claims related to a master claim brand
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | undefined, countryCode: string | undefined): Promise<Claim[]> {
  const { data, error } = await supabase.rpc('get_all_claims_for_master_brand', {
    master_brand_id_param: masterClaimBrandId,
    product_id_param: productId,
    country_code_param: countryCode
  });

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

async function styleBrandClaimsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterClaimBrandId, productId, countryCode } = body;

    if (!masterClaimBrandId || typeof masterClaimBrandId !== 'string') {
      return fail(400, 'Master Claim Brand ID must be a string.');
    }
    
    const supabase = createSupabaseAdminClient();

    // If productId and countryCode are provided, reuse stacked claims for precedence consistency
    if (productId && countryCode) {
      const effective = await getStackedClaimsForProduct(productId, countryCode);
      const { data: brandData } = await supabase
        .from('master_claim_brands')
        .select('name')
        .eq('id', masterClaimBrandId)
        .single();
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
        brandData?.name
      );
      return ok({ brandName: brandData?.name || 'Unknown Brand', styledClaims: formatted, rawClaimsForAI: effective.map(ec => ({ text: ec.claim_text, type: ec.final_claim_type, level: ec.source_level, market: ec.original_claim_country_code })) });
    }

    // 1. Fetch all claims (brand-oriented)
    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, countryCode);

    if (allClaims.length === 0) {
      const { data: brandData } = await supabase.from('master_claim_brands').select('name').eq('id', masterClaimBrandId).single();
      return ok({ brandName: brandData?.name || 'Unknown Brand', styledClaims: [], rawClaimsForAI: [] });
    }

    // 2. Sort claims to establish precedence
    const sortedClaims = allClaims.sort(sortClaims);

    // 3. Use all claims without deduplication to preserve exact database values
    // Note: Keeping all claims as requested in issue #107
    const allClaimsToDisplay = sortedClaims;

    // Get brand and product names for the introductory sentence
    const { data: brandData } = await supabase
      .from('master_claim_brands')
      .select('name')
      .eq('id', masterClaimBrandId)
      .single();
    
    let productName: string | undefined;
    if (productId) {
      const { data: productData } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
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
      brandData?.name
    );

    // Log for debugging
    logDebug('Formatted claims without AI:', {
      brandName: brandData?.name,
      productName,
      totalClaims: allClaimsToDisplay.length
    });

    return ok({
      brandName: brandData?.name || 'Unknown Brand',
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
    return fail(500, 'Failed to style brand claims', error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

export const POST = withAuthAndCSRF(styleBrandClaimsHandler); 
