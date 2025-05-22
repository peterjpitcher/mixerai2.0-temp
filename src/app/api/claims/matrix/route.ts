import { NextResponse, NextRequest } from 'next/server';
import { getStackedClaimsForProduct, Claim, Product, ClaimTypeEnum } from '@/lib/claims-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

// Enhanced types for matrix response
interface MarketClaimOverrideInfo {
  overrideId: string;
  isBlocked: boolean;
  masterClaimIdItOverrides: string;
  replacementClaimId?: string | null;
  replacementClaimText?: string | null; // For UI display
  replacementClaimType?: ClaimTypeEnum | null;
}

interface MatrixCellData {
  effectiveClaim: Claim | null;
  sourceMasterClaim?: Claim | null; // The __GLOBAL__ claim that would apply if no override, or is the effectiveClaim
  activeOverride?: MarketClaimOverrideInfo | null;
}

interface MatrixProductRow {
  id: string;
  name: string;
  claims: Record<string, MatrixCellData | null>; // Key: claim_text, Value: enriched cell data
}

interface ClaimsMatrixResponse {
  products: MatrixProductRow[];
  uniqueClaimTexts: string[];
}

// Helper to fetch replacement claim details if an ID is present
async function getReplacementClaimDetails(supabase: SupabaseClient, claimId: string | null | undefined): Promise<Claim | null> {
    if (!claimId) return null;
    // @ts-ignore
    const { data, error } = await supabase.from('claims').select('id, claim_text, claim_type, country_code, level').eq('id', claimId).single();
    if (error || !data) {
        console.warn(`[API Claims Matrix] Could not fetch replacement claim details for ID ${claimId}:`, error);
        return null;
    }
    return data as Claim;
}

// GET handler for fetching the claims matrix
export const GET = withAuth(async (req: NextRequest, user: User) => {
  try {
    const { searchParams } = new URL(req.url);
    const targetCountryCode = searchParams.get('countryCode');
    const globalBrandIdFilter = searchParams.get('globalBrandId'); // Optional filter

    if (isBuildPhase()) {
      console.log(`[API Claims Matrix GET] Build phase: returning empty structure.`);
      return NextResponse.json<ClaimsMatrixResponse>({ 
        success: true, 
        isMockData: true, 
        data: { products: [], uniqueClaimTexts: [] }
      } as any); // Added 'as any' to satisfy build phase return type until full type is defined
    }

    if (!targetCountryCode || typeof targetCountryCode !== 'string' || targetCountryCode.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'countryCode query parameter is required and must be a non-empty string.' }, 
        { status: 400 }
      );
    }

    // TODO: Permission check: Does the user have rights to view this matrix?
    // This could involve checking roles or specific brand access if globalBrandIdFilter is used.

    const supabase = createSupabaseAdminClient();

    // 1. Fetch products
    // @ts-ignore - Assuming 'products' table exists and types are broadly compatible
    let productsQuery = supabase.from('products').select('id, name, global_brand_id');
    if (globalBrandIdFilter) {
      // @ts-ignore
      productsQuery = productsQuery.eq('global_brand_id', globalBrandIdFilter);
    }
    // @ts-ignore
    const { data: productsData, error: productsError } = await productsQuery.order('name');

    if (productsError) {
      console.error('[API Claims Matrix GET] Error fetching products:', productsError);
      return handleApiError(productsError, 'Failed to fetch products for the matrix.');
    }
    const products: Product[] = (productsData as Product[]) || [];
    if (products.length === 0) {
        return NextResponse.json<ClaimsMatrixResponse>({ 
            success: true, 
            data: { products: [], uniqueClaimTexts: [] } 
        } as any); // Added 'as any' for now
    }

    // 2. Determine all unique claim texts by checking effective claims for targetCountryCode across all products
    const allClaimTextsSet = new Set<string>();
    const initialProductClaimResults = await Promise.all(products.map(async (product) => {
        const claims = await getStackedClaimsForProduct(product.id, targetCountryCode);
        claims.forEach(claim => allClaimTextsSet.add(claim.claim_text));
        return { productId: product.id, claims }; // Keep these for step 3a
    }));
    const uniqueClaimTexts = Array.from(allClaimTextsSet).sort();

    const matrixProductRows: MatrixProductRow[] = [];

    for (const product of products) {
      const productCellClaims: Record<string, MatrixCellData | null> = {};

      // 3a. Get effective claims for the current product in the target market (already fetched)
      const effectiveClaimsForProductInMarket = initialProductClaimResults.find(r => r.productId === product.id)?.claims || [];

      // 3b. Get potential source master claims for this product (by checking __GLOBAL__ market)
      const globalMarketClaimsForProduct = await getStackedClaimsForProduct(product.id, '__GLOBAL__');
      
      // 3c. Fetch all market overrides related to this product and target market for efficiency
      // @ts-ignore
      const { data: productOverridesData, error: overridesError } = await supabase
        .from('market_claim_overrides')
        .select('id, master_claim_id, is_blocked, replacement_claim_id')
        .eq('target_product_id', product.id)
        .eq('market_country_code', targetCountryCode);

      const productOverrides: any[] = productOverridesData || [];

      if (overridesError) {
        console.warn(`[API Claims Matrix] Error fetching overrides for product ${product.id}:`, overridesError);
        // Continue processing this product but overrides might be missing
      }

      for (const claimText of uniqueClaimTexts) {
        const cellData: MatrixCellData = { effectiveClaim: null, sourceMasterClaim: null, activeOverride: null };

        // Find effective claim for this cell
        cellData.effectiveClaim = effectiveClaimsForProductInMarket.find(c => c.claim_text === claimText) || null;

        // Find potential source master claim for this cell
        const potentialMaster = globalMarketClaimsForProduct.find(c => c.claim_text === claimText);
        if (potentialMaster && potentialMaster.country_code === '__GLOBAL__') {
          cellData.sourceMasterClaim = potentialMaster;

          // Check if an override exists for this sourceMasterClaim and product/market
          const override = productOverrides.find((ov: any) => ov.master_claim_id === cellData.sourceMasterClaim!.id);
          if (override) {
            const replacementDetails = await getReplacementClaimDetails(supabase as SupabaseClient, override.replacement_claim_id);
            cellData.activeOverride = {
              overrideId: override.id,
              isBlocked: override.is_blocked,
              masterClaimIdItOverrides: override.master_claim_id,
              replacementClaimId: override.replacement_claim_id,
              replacementClaimText: replacementDetails?.claim_text || null,
              replacementClaimType: replacementDetails?.claim_type || null,
            };
            // If an override is active and it blocks, the effective claim might be null (if no replacement) 
            // or it is the replacement. getStackedClaimsForProduct should handle this correctly for effectiveClaim.
            // Here we are primarily identifying the override itself.
          }
        }
        productCellClaims[claimText] = cellData;
      }

      matrixProductRows.push({
        id: product.id,
        name: product.name,
        claims: productCellClaims,
      });
    }
    
    const responseData: ClaimsMatrixResponse = {
        products: matrixProductRows,
        uniqueClaimTexts,
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error: any) {
    console.error(`[API Claims Matrix GET] Catched error:`, error);
    return handleApiError(error, 'An unexpected error occurred while fetching the claims matrix.');
  }
});