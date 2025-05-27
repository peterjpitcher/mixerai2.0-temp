import { NextResponse, NextRequest } from 'next/server';
import { getStackedClaimsForProduct, Claim, Product, ClaimTypeEnum, EffectiveClaim, FinalClaimTypeEnum } from '@/lib/claims-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

// Types for the new API response structure
interface MarketClaimOverrideInfo {
  overrideId: string;
  isBlocked: boolean;
  masterClaimIdItOverrides: string;
  replacementClaimId?: string | null;
  replacementClaimText?: string | null;
  replacementClaimType?: ClaimTypeEnum | null;
}

interface ApiProductInfo {
  id: string;
  name: string;
}

interface ApiClaimTextInfo {
  text: string;
  // Future: Add other claim-specific details here if needed for row headers
}

interface MatrixCell {
  effectiveStatus: FinalClaimTypeEnum;
  effectiveClaimSourceLevel?: EffectiveClaim['source_level'];
  sourceMasterClaimId?: string | null;
  isActuallyMaster: boolean;
  activeOverride?: MarketClaimOverrideInfo | null;
  description?: string | null;
  isBlockedOverride?: boolean;
  isReplacementOverride?: boolean;
  originalMasterClaimIdIfOverridden?: string | null;
  // Store the original effective claim for more detailed popups/interactions on the frontend
  originalEffectiveClaimDetails?: EffectiveClaim | null; 
}

interface ClaimsMatrixApiResponseData {
  claimTextsAsRows: ApiClaimTextInfo[];
  productsAsCols: ApiProductInfo[];
  cellData: Record<string, Record<string, MatrixCell | null>>; // Keyed by claimText.text, then by product.id
}

// Helper to fetch replacement claim details (can remain similar)
async function getReplacementClaimDetails(supabase: SupabaseClient, claimId: string | null | undefined): Promise<Claim | null> {
    if (!claimId) return null;
    const { data, error } = await supabase.from('claims').select('id, claim_text, claim_type, country_code, level').eq('id', claimId).single<Claim>();
    if (error || !data) {
        console.warn(`[API Claims Matrix] Could not fetch replacement claim details for ID ${claimId}:`, error);
        return null;
    }
    return data;
}

export const GET = withAuth(async (req: NextRequest, user: User) => {
  try {
    const { searchParams } = new URL(req.url);
    const targetCountryCode = searchParams.get('countryCode');
    const masterBrandIdFilter = searchParams.get('masterBrandId');

    if (isBuildPhase()) {
      console.log(`[API Claims Matrix GET] Build phase: returning empty structure.`);
      return NextResponse.json({
        success: true,
        isMockData: true,
        data: { claimTextsAsRows: [], productsAsCols: [], cellData: {} }
      });
    }

    if (!targetCountryCode || typeof targetCountryCode !== 'string' || targetCountryCode.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'countryCode query parameter is required.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    let productsQuery = supabase.from('products').select('id, name, description, master_brand_id');
    if (masterBrandIdFilter) {
      productsQuery = productsQuery.eq('master_brand_id', masterBrandIdFilter);
    }
    const { data: productsData, error: productsError } = await productsQuery.order('name');

    if (productsError) {
      console.error('[API Claims Matrix GET] Error fetching products:', productsError);
      return handleApiError(productsError, 'Failed to fetch products for the matrix.');
    }
    // Filter out products with null master_brand_id as the Product type expects it to be a string
    const validProductsData = (productsData || []).filter(p => p.master_brand_id !== null);
    const products: Product[] = validProductsData.map(p => ({ ...p, master_brand_id: p.master_brand_id as string }));

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        data: { claimTextsAsRows: [], productsAsCols: [], cellData: {} }
      });
    }

    const productsAsCols: ApiProductInfo[] = products.map(p => ({ id: p.id, name: p.name }));
    const allClaimTextsSet = new Set<string>();
    const productEffectiveClaimsCache: Record<string, EffectiveClaim[]> = {};
    const productGlobalClaimsCache: Record<string, EffectiveClaim[]> = {};
    const productOverridesCache: Record<string, any[]> = {}; // Using any for Supabase dynamic type

    // Pre-fetch all necessary data for each product
    for (const product of products) {
      const effectiveClaims = await getStackedClaimsForProduct(product.id, targetCountryCode);
      productEffectiveClaimsCache[product.id] = effectiveClaims;
      effectiveClaims.forEach(claim => allClaimTextsSet.add(claim.claim_text));

      const globalClaims = await getStackedClaimsForProduct(product.id, '__GLOBAL__');
      productGlobalClaimsCache[product.id] = globalClaims;
      // Add global claim texts too, as they might be overridden and thus relevant
      globalClaims.forEach(claim => allClaimTextsSet.add(claim.claim_text));
      
      const { data: overridesData, error: overridesError } = await supabase
        .from('market_claim_overrides')
        .select('id, master_claim_id, is_blocked, replacement_claim_id')
        .eq('target_product_id', product.id)
        .eq('market_country_code', targetCountryCode);
      
      if (overridesError) {
        console.warn(`[API Claims Matrix] Error fetching overrides for product ${product.id}:`, overridesError);
        productOverridesCache[product.id] = [];
      } else {
        productOverridesCache[product.id] = overridesData || [];
      }
    }

    const claimTextsAsRows: ApiClaimTextInfo[] = Array.from(allClaimTextsSet).sort().map(text => ({ text }));
    const cellData: Record<string, Record<string, MatrixCell | null>> = {};

    for (const claimInfo of claimTextsAsRows) {
      const claimText = claimInfo.text;
      cellData[claimText] = {};

      for (const product of products) {
        const effectiveClaimForCell = productEffectiveClaimsCache[product.id]?.find(ec => ec.claim_text === claimText);
        const globalClaimForCellText = productGlobalClaimsCache[product.id]?.find(gc => gc.claim_text === claimText);
        
        let matrixCell: MatrixCell | null = null;

        if (effectiveClaimForCell) {
          matrixCell = {
            effectiveStatus: effectiveClaimForCell.final_claim_type,
            effectiveClaimSourceLevel: effectiveClaimForCell.source_level,
            isActuallyMaster: effectiveClaimForCell.original_claim_country_code === '__GLOBAL__' && effectiveClaimForCell.source_level !== 'override',
            description: effectiveClaimForCell.description,
            isBlockedOverride: effectiveClaimForCell.is_blocked_override,
            isReplacementOverride: effectiveClaimForCell.is_replacement_override,
            originalMasterClaimIdIfOverridden: effectiveClaimForCell.original_master_claim_id_if_overridden,
            sourceMasterClaimId: null, // Will be populated below if applicable
            activeOverride: null, // Will be populated below if applicable
            originalEffectiveClaimDetails: effectiveClaimForCell,
          };
        } else {
           // If no effective claim, it implies 'none' or the claim text doesn't apply at all to this product.
           // We still need to check if a global claim for this text existed and was overridden.
            matrixCell = {
                effectiveStatus: 'none',
                isActuallyMaster: false,
                sourceMasterClaimId: null,
                activeOverride: null,
                originalEffectiveClaimDetails: null,
            };
        }

        // Check for master claim context and overrides
        if (globalClaimForCellText && globalClaimForCellText.original_claim_country_code === '__GLOBAL__') {
          matrixCell.sourceMasterClaimId = globalClaimForCellText.source_claim_id; // ID of the original master claim
          
          const productOverrides = productOverridesCache[product.id];
          const override = productOverrides.find(ov => ov.master_claim_id === globalClaimForCellText.source_claim_id);

          if (override) {
            const replacementDetails = await getReplacementClaimDetails(supabase, override.replacement_claim_id);
            matrixCell.activeOverride = {
              overrideId: override.id,
              isBlocked: override.is_blocked,
              masterClaimIdItOverrides: override.master_claim_id,
              replacementClaimId: override.replacement_claim_id,
              replacementClaimText: replacementDetails?.claim_text || null,
              replacementClaimType: replacementDetails?.claim_type || null,
            };
            // If an override exists, the effectiveClaimForCell should reflect it.
            // isActuallyMaster should be false if an override is in play for a master claim.
            matrixCell.isActuallyMaster = false; 
          }
        }
        
        // If there's no effective claim AND no global master context for this text, it truly doesn't apply.
        // However, the loop through claimTextsAsRows ensures we have a cell for every claim text.
        // If matrixCell is still mostly empty but effectiveClaimForCell was null, this means
        // the claim text (potentially from another product) is not applicable to this product.
        // The effectiveStatus would be 'none'.

        cellData[claimText][product.id] = matrixCell;
      }
    }

    const responseData: ClaimsMatrixApiResponseData = {
      claimTextsAsRows,
      productsAsCols,
      cellData,
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error: any) {
    console.error(`[API Claims Matrix GET] Caught error:`, error);
    return handleApiError(error, 'An unexpected error occurred while fetching the claims matrix.');
  }
});
