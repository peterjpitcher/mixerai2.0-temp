import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { formatClaimsDirectly, deduplicateClaims } from '@/lib/claims-formatter';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { logDebug, logError } from '@/lib/logger';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { getStackedClaimsForProduct } from '@/lib/claims-utils';
import { ok, fail } from '@/lib/http/response';
import { BrandPermissionVerificationError, isPlatformAdminUser, userHasBrandAccess } from '@/lib/auth/brand-access';
import { logContentGenerationAudit } from '@/lib/audit/content';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';

type Claim = {
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

/**
 * Fetches all claims at brand, product, and ingredient levels
 * 
 * @param supabase - Initialized Supabase admin client
 * @param masterClaimBrandId - The master claim brand ID to fetch brand-level claims
 * @param productId - The product ID to fetch product and ingredient claims (nullable)
 * @param countryCode - Country code to filter claims, or null for all countries
 * @returns Promise<Claim[]> Array of claims with text, type, level, and country
 * 
 * @description
 * Fetches claims from three levels:
 * 1. Brand-level claims using masterClaimBrandId
 * 2. Product-level claims if productId is provided
 * 3. Ingredient-level claims through product_ingredients junction
 * 
 * Applies country filtering when countryCode is provided, otherwise
 * returns both country-specific and global (ALL) claims.
 */
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | null, countryCode: string | null): Promise<Claim[]> {
  // Fetch brand-level claims
  let brandQuery = supabase
    .from('claims')
    .select('claim_text, claim_type, level, country_code')
    .eq('master_brand_id', masterClaimBrandId)
    .eq('level', 'brand');

  // Fetch product-level claims if productId is provided
  let productQuery = productId 
    ? supabase
        .from('claims')
        .select('claim_text, claim_type, level, country_code')
        .eq('product_id', productId)
        .eq('level', 'product')
    : null;

  // Fetch ingredient-level claims if productId is provided
  let ingredientClaims: Claim[] = [];
  if (productId) {
    // First get the ingredient IDs for this product
    const { data: ingredients, error: ingredientError } = await supabase
      .from('product_ingredients')
      .select('ingredient_id')
      .eq('product_id', productId);
    
    if (!ingredientError && ingredients && ingredients.length > 0) {
      const ingredientIds = ingredients.map(i => i.ingredient_id);
      const { data: ingredientClaimsData, error: claimsError } = await supabase
        .from('claims')
        .select('claim_text, claim_type, level, country_code')
        .eq('level', 'ingredient')
        .in('ingredient_id', ingredientIds);
      
      if (!claimsError && ingredientClaimsData) {
        ingredientClaims = ingredientClaimsData as Claim[];
      }
    }
  }

  // Add country filter if provided
  if (countryCode) {
    // Use parameterized filters to prevent SQL injection
    brandQuery = brandQuery.or(`country_code.eq.${countryCode.replace(/[^a-zA-Z0-9_-]/g, '')},country_code.eq.${GLOBAL_CLAIM_COUNTRY_CODE}`);
    if (productQuery) productQuery = productQuery.or(`country_code.eq.${countryCode.replace(/[^a-zA-Z0-9_-]/g, '')},country_code.eq.${GLOBAL_CLAIM_COUNTRY_CODE}`);
    // Filter ingredient claims by country
    ingredientClaims = ingredientClaims.filter(claim => 
      claim.country_code === countryCode || claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE
    );
  }

  // Execute queries
  const allClaims: Claim[] = [];
  
  // Add brand claims
  const { data: brandClaims, error: brandError } = await brandQuery;
  if (brandError) {
    console.error('Error fetching brand claims:', brandError);
    throw new Error('Failed to fetch claims for the brand.');
  }
  if (brandClaims) {
    allClaims.push(...(brandClaims as Claim[]));
  }
  
  // Add product claims
  if (productQuery) {
    const { data: productClaims, error: productError } = await productQuery;
    if (productError) {
      console.error('Error fetching product claims:', productError);
      throw new Error('Failed to fetch claims for the product.');
    }
    if (productClaims) {
      allClaims.push(...(productClaims as Claim[]));
    }
  }
  
  // Add ingredient claims
  allClaims.push(...ingredientClaims);

  return allClaims;
}

function sortClaims(a: Claim, b: Claim): number {
  // Sort by level order: product > ingredient > brand
  const levelOrder = { product: 1, ingredient: 2, brand: 3 };
  const aLevel = levelOrder[a.level];
  const bLevel = levelOrder[b.level];
  if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }

  // Sort by market specificity: specific market > global
  const aIsGlobal = a.country_code === GLOBAL_CLAIM_COUNTRY_CODE;
  const bIsGlobal = b.country_code === GLOBAL_CLAIM_COUNTRY_CODE;
  if (aIsGlobal !== bIsGlobal) {
    return aIsGlobal ? 1 : -1;
  }

  return 0;
}

/**
 * Prepares product context by fetching and styling claims for content generation
 * 
 * @param request - Next.js request object containing productId in JSON body
 * @returns Promise<NextResponse> containing styled claims and product information
 * 
 * @description
 * This handler performs the following operations:
 * 1. Fetches all relevant claims for a product (brand, product, and ingredient levels)
 * 2. Sorts claims by priority (mandatory > allowed > disallowed) and level (brand > product > ingredient)
 * 3. For global (ALL countries) claims, removes duplicates
 * 4. Fetches the product's master brand information
 * 5. Uses AI to style the claims into marketing-friendly language based on brand identity
 * 
 * The styled claims are formatted for easy insertion into content generation prompts
 * and include both the original claims data and the AI-styled marketing version.
 * 
 * @example
 * POST /api/content/prepare-product-context
 * Body: { "productId": "123e4567-e89b-12d3-a456-426614174000" }
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "productName": "Example Product",
 *     "styledClaims": "✓ Clinically proven effectiveness...",
 *     "claims": [...]
 *   }
 * }
 */
const requestSchema = z.object({
  productId: z.string().uuid('productId must be a valid UUID'),
  countryCode: z
    .string()
    .length(2, 'countryCode must be a 2-letter ISO code')
    .transform((code) => code.toUpperCase())
    .optional(),
});

async function prepareProductContextHandler(request: NextRequest, user: User) {
  try {
    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return fail(400, 'Invalid request payload', JSON.stringify(parsedBody.error.flatten()));
    }

    const { productId, countryCode } = parsedBody.data;
    
    const supabase = createSupabaseAdminClient();

    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('name, master_brand_id')
        .eq('id', productId)
        .maybeSingle();
    
    if (productError) {
      logError('[prepare-product-context] Failed to load product', productError);
      return fail(500, 'Could not load product information.');
    }

    if (!productData) {
      return fail(404, 'Product not found.');
    }
    
    const { name: productName, master_brand_id: masterClaimBrandId } = productData;

    if (!masterClaimBrandId) {
      if (!isPlatformAdminUser(user)) {
        return fail(403, 'This product is not linked to a brand. Only platform admins may access its context.');
      }
      return ok({ productName, styledClaims: null });
    }

    const { data: masterBrand, error: masterBrandError } = await supabase
      .from('master_claim_brands')
      .select('id, name, mixerai_brand_id')
      .eq('id', masterClaimBrandId)
      .single();

    if (masterBrandError || !masterBrand) {
      return fail(404, 'Master brand not found for the specified product.');
    }

    if (!isPlatformAdminUser(user)) {
      if (!masterBrand.mixerai_brand_id) {
        return fail(403, 'This product is not yet linked to a MixerAI brand. Contact an administrator to complete setup.');
      }

      try {
        const hasAccess = await userHasBrandAccess(supabase, user, masterBrand.mixerai_brand_id);
        if (!hasAccess) {
          return fail(403, 'You do not have permission to access this product.');
        }
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return fail(500, 'Unable to verify brand permissions at this time.', error.message);
        }
        throw error;
      }
    }

    const rateLimitResult = await enforceContentRateLimits(request, user.id, masterBrand.mixerai_brand_id);
    if ('type' in rateLimitResult) {
      return NextResponse.json(rateLimitResult.body, {
        status: rateLimitResult.status,
        headers: rateLimitResult.headers,
      });
    }

    if (countryCode) {
      const effective = await getStackedClaimsForProduct(productId, countryCode);
      const formatted = formatClaimsDirectly(
        effective.map((ec, index) => ({
          id: `${ec.claim_text}_${index}`,
          claim_text: ec.claim_text,
          claim_type: ec.final_claim_type === 'none' ? 'disallowed' : (ec.final_claim_type as 'allowed'|'disallowed'),
          level: (ec.source_level || 'none').toString().replace(/^./, c => c.toUpperCase()),
          country_code: ec.original_claim_country_code || countryCode,
          priority: effective.length - index,
        })),
        productName,
        undefined
      );
      await logContentGenerationAudit({
        action: 'content_prepare_product_context',
        userId: user.id,
        brandId: masterBrand.mixerai_brand_id,
        metadata: {
          productId,
          countryCode,
          claimsReturned: effective.length,
        },
      });

      return ok({ productName, styledClaims: formatted });
    }

    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, null);

    if (allClaims.length === 0) {
      await logContentGenerationAudit({
        action: 'content_prepare_product_context',
        userId: user.id,
        brandId: masterBrand.mixerai_brand_id,
        metadata: {
          productId,
          claimsReturned: 0,
        },
      });
      return ok({ productName, styledClaims: null });
    }

    const sortedClaims = allClaims.sort(sortClaims);

    // Deduplicate claims while preserving priority
    const uniqueClaims = deduplicateClaims(
      sortedClaims.map((claim, index) => ({
        id: `${claim.claim_text}_${index}`,
        claim_text: claim.claim_text,
        claim_type: claim.claim_type,
        level: claim.level.charAt(0).toUpperCase() + claim.level.slice(1), // Capitalize level
        country_code: claim.country_code,
        priority: sortedClaims.length - index // Higher priority for earlier items
      }))
    );

    // Get master brand name for context
    // Format claims directly without AI
    const formattedClaims = formatClaimsDirectly(
      uniqueClaims,
      productName,
      masterBrand.name
    );

    logDebug('[prepare-product-context] Formatted claims without AI:', {
      productName,
      brandName: masterBrand.name,
      totalUniqueClaimsCount: uniqueClaims.length,
      totalClaimsCount: allClaims.length
    });

    await logContentGenerationAudit({
      action: 'content_prepare_product_context',
      userId: user.id,
      brandId: masterBrand.mixerai_brand_id,
      metadata: {
        productId,
        claimsReturned: uniqueClaims.length,
      },
    });

    return ok({ productName, styledClaims: formattedClaims });

  } catch (error: unknown) {
    logError('Error in /api/content/prepare-product-context handler:', error);
    return fail(500, 'Failed to prepare product context', (error as Error).message);
  }
}

export const POST = withAuthAndCSRF(prepareProductContextHandler); 
