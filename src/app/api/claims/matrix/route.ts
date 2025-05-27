import { NextResponse, NextRequest } from 'next/server';
import { Product, ClaimTypeEnum, EffectiveClaim, FinalClaimTypeEnum, Claim, MasterClaimBrand, Ingredient, ProductIngredientAssociation, MarketClaimOverride, ClaimLevelEnum } from '@/lib/claims-utils';
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

// Helper to fetch replacement claim details (can remain similar, or be integrated into bulk fetching)
// For now, keeping it separate. Can be optimized to fetch in bulk later.
async function getReplacementClaimDetails(supabase: SupabaseClient, claimId: string | null | undefined): Promise<Claim | null> {
    if (!claimId) return null;
    // @ts-ignore
    const { data, error } = await supabase.from('claims').select('id, claim_text, claim_type, country_code, level').eq('id', claimId).single<Claim>();
    if (error || !data) {
        console.warn(`[API Claims Matrix] Could not fetch replacement claim details for ID ${claimId}:`, error?.message);
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

    // 1. Fetch Products
    let productsQuery = supabase.from('products').select('id, name, description, master_brand_id');
    if (masterBrandIdFilter) {
      productsQuery = productsQuery.eq('master_brand_id', masterBrandIdFilter);
    }
    // @ts-ignore
    const { data: productsData, error: productsError } = await productsQuery.order('name');

    if (productsError) {
      console.error('[API Claims Matrix GET] Error fetching products:', productsError);
      return handleApiError(productsError, 'Failed to fetch products for the matrix.');
    }
    const validProductsData = (productsData || []).filter(p => p.master_brand_id !== null);
    const products: Product[] = validProductsData.map(p => ({ ...p, master_brand_id: p.master_brand_id as string }));

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        data: { claimTextsAsRows: [], productsAsCols: [], cellData: {} }
      });
    }

    const productsAsCols: ApiProductInfo[] = products.map(p => ({ id: p.id, name: p.name }));
    const productIds = products.map(p => p.id);
    const uniqueMasterBrandIds = Array.from(new Set(products.map(p => p.master_brand_id)));

    // 2. Bulk Fetch Claims Data
    // @ts-ignore
    const { data: brandLevelClaimsData, error: brandClaimsError } = await supabase
      .from('claims')
      .select('*')
      .in('master_brand_id', uniqueMasterBrandIds)
      .in('country_code', [targetCountryCode, '__GLOBAL__'])
      .eq('level', 'brand');
    if (brandClaimsError) return handleApiError(brandClaimsError, 'Failed to fetch brand claims.');
    const brandLevelClaims: Claim[] = (brandLevelClaimsData || []).filter(c => c.country_code !== null) as Claim[];

    // @ts-ignore
    const { data: productLevelClaimsData, error: productClaimsError } = await supabase
      .from('claims')
      .select('*')
      .in('product_id', productIds)
      .in('country_code', [targetCountryCode, '__GLOBAL__'])
      .eq('level', 'product');
    if (productClaimsError) return handleApiError(productClaimsError, 'Failed to fetch product claims.');
    const productLevelClaims: Claim[] = (productLevelClaimsData || []).filter(c => c.country_code !== null) as Claim[];
    
    // @ts-ignore
    const { data: productIngredientLinksData, error: piError } = await supabase
        .from('product_ingredients')
        .select('product_id, ingredient_id')
        .in('product_id', productIds);
    if (piError) return handleApiError(piError, 'Failed to fetch product ingredients.');
    const productIngredientLinks: ProductIngredientAssociation[] = productIngredientLinksData || [];
    
    const uniqueIngredientIds = Array.from(new Set(productIngredientLinks.map(link => link.ingredient_id)));
    let ingredientLevelClaims: Claim[] = [];
    if (uniqueIngredientIds.length > 0) {
        // @ts-ignore
        const { data: ingredientClaimsData, error: ingredientClaimsError } = await supabase
            .from('claims')
            .select('*')
            .in('ingredient_id', uniqueIngredientIds)
            .in('country_code', [targetCountryCode, '__GLOBAL__'])
            .eq('level', 'ingredient');
        if (ingredientClaimsError) return handleApiError(ingredientClaimsError, 'Failed to fetch ingredient claims.');
        ingredientLevelClaims = (ingredientClaimsData || []).filter(c => c.country_code !== null) as Claim[];
    }

    // 3. Bulk Fetch Market Overrides
    // @ts-ignore
    const { data: marketOverridesData, error: overridesError } = await supabase
        .from('market_claim_overrides')
        .select('*') // Fetch all columns for now, can be optimized
        .in('target_product_id', productIds)
        .eq('market_country_code', targetCountryCode);
    if (overridesError) return handleApiError(overridesError, 'Failed to fetch market overrides.');
    const marketOverrides: MarketClaimOverride[] = marketOverridesData || [];

    // 4. Bulk Fetch Replacement Claim Details
    const replacementClaimIds = marketOverrides
        .map(ov => ov.replacement_claim_id)
        .filter((id): id is string => id !== null && id !== undefined);
    
    const uniqueReplacementClaimIds = Array.from(new Set(replacementClaimIds));
    let replacementClaimsMap: Map<string, Claim> = new Map();
    if (uniqueReplacementClaimIds.length > 0) {
        // @ts-ignore
        const { data: replacementClaimsData, error: rcError } = await supabase
            .from('claims')
            .select('*') // Fetch all columns for now
            .in('id', uniqueReplacementClaimIds);
        if (rcError) return handleApiError(rcError, 'Failed to fetch replacement claims.');
        (replacementClaimsData || []).forEach((claim: Claim) => replacementClaimsMap.set(claim.id, claim));
    }

    // Aggregate all claims to find unique claim texts for rows
    const allFetchedClaims: Claim[] = [
        ...brandLevelClaims,
        ...productLevelClaims,
        ...ingredientLevelClaims,
    ];
    marketOverrides.forEach(ov => { // Also consider replacement claim texts for row generation
        if (ov.replacement_claim_id) {
            const repClaim = replacementClaimsMap.get(ov.replacement_claim_id);
            if (repClaim) allFetchedClaims.push(repClaim);
        }
    });

    const allClaimTextsSet = new Set<string>();
    allFetchedClaims.forEach(claim => allClaimTextsSet.add(claim.claim_text));
    const claimTextsAsRows: ApiClaimTextInfo[] = Array.from(allClaimTextsSet).sort().map(text => ({ text }));

    // ----- START OF COMPLEX LOGIC TO REPLICATE getStackedClaimsForProduct PER CELL -----
    const cellData: Record<string, Record<string, MatrixCell | null>> = {};

    for (const claimInfo of claimTextsAsRows) {
      const currentClaimText = claimInfo.text;
      cellData[currentClaimText] = {};

      for (const product of products) {
        // Find relevant claims for this product and claim_text
        const claimsForCurrentTextAndProduct: Claim[] = [];
        
        // 1. Product Level Claims for this product
        productLevelClaims.forEach(plc => {
            if (plc.product_id === product.id && plc.claim_text === currentClaimText) {
                claimsForCurrentTextAndProduct.push(plc);
            }
        });

        // 2. Ingredient Level Claims for this product
        const productIngredients = productIngredientLinks
            .filter(link => link.product_id === product.id)
            .map(link => link.ingredient_id);
        
        ingredientLevelClaims.forEach(ilc => {
            if (productIngredients.includes(ilc.ingredient_id!) && ilc.claim_text === currentClaimText) {
                 claimsForCurrentTextAndProduct.push(ilc);
            }
        });
        
        // 3. Brand Level Claims for this product's brand
        brandLevelClaims.forEach(blc => {
            if (blc.master_brand_id === product.master_brand_id && blc.claim_text === currentClaimText) {
                claimsForCurrentTextAndProduct.push(blc);
            }
        });

        // Prioritize and select the single most relevant claim before considering overrides
        // Priority: Market-Specific > Global; Product > Ingredient > Brand
        let baseEffectiveClaim: EffectiveClaim | null = null;
        
        if (claimsForCurrentTextAndProduct.length > 0) {
            claimsForCurrentTextAndProduct.sort((a: Claim, b: Claim) => {
                const aIsMarket = a.country_code === targetCountryCode;
                const bIsMarket = b.country_code === targetCountryCode;
                if (aIsMarket !== bIsMarket) return aIsMarket ? -1 : 1;

                const levelPriority = (level: ClaimLevelEnum) => (level === 'product' ? 3 : level === 'ingredient' ? 2 : 1);
                return levelPriority(b.level) - levelPriority(a.level);
            });
            
            const topClaim = claimsForCurrentTextAndProduct[0];
            baseEffectiveClaim = {
                claim_text: topClaim.claim_text,
                final_claim_type: topClaim.claim_type as FinalClaimTypeEnum,
                source_level: topClaim.level,
                source_claim_id: topClaim.id,
                description: topClaim.description,
                applies_to_product_id: product.id,
                applies_to_country_code: targetCountryCode,
                original_claim_country_code: topClaim.country_code,
                source_entity_id: topClaim.product_id || topClaim.ingredient_id || topClaim.master_brand_id,
                isActuallyMaster: topClaim.country_code === '__GLOBAL__',
            };
        }

        // Check for overrides ONLY if the base claim is a GLOBAL claim
        let finalMatrixCell: MatrixCell;
        const masterClaimForOverrideContext: EffectiveClaim | Claim | undefined = 
            (baseEffectiveClaim?.original_claim_country_code === '__GLOBAL__') 
                ? baseEffectiveClaim 
                : brandLevelClaims.find(blc => 
                    blc.master_brand_id === product.master_brand_id && 
                    blc.claim_text === currentClaimText && 
                    blc.country_code === '__GLOBAL__');

        // Determine the actual ID of the master claim being considered for an override
        let masterClaimIdForCurrentContext: string | null | undefined = null;
        if (masterClaimForOverrideContext) {
            // Check if it has source_claim_id (duck typing for EffectiveClaim-like structure from baseEffectiveClaim)
            if ('source_claim_id' in masterClaimForOverrideContext && masterClaimForOverrideContext.source_claim_id) {
                masterClaimIdForCurrentContext = masterClaimForOverrideContext.source_claim_id;
            } else if ('id' in masterClaimForOverrideContext) { // Fallback to id if it's a raw Claim
                masterClaimIdForCurrentContext = masterClaimForOverrideContext.id;
            }
        }

        if (masterClaimIdForCurrentContext) {
            const override = marketOverrides.find(ov => 
                ov.master_claim_id === masterClaimIdForCurrentContext && 
                ov.target_product_id === product.id
            );

            if (override) {
                const replacementClaim = override.replacement_claim_id ? replacementClaimsMap.get(override.replacement_claim_id) : null;
                finalMatrixCell = {
                    effectiveStatus: override.is_blocked 
                        ? (replacementClaim ? replacementClaim.claim_type : 'none') 
                        : (baseEffectiveClaim ? baseEffectiveClaim.final_claim_type : 'none'),
                    effectiveClaimSourceLevel: 'override',
                    sourceMasterClaimId: masterClaimIdForCurrentContext, // Use the resolved ID
                    isActuallyMaster: false, 
                    activeOverride: {
                        overrideId: override.id,
                        isBlocked: override.is_blocked,
                        masterClaimIdItOverrides: override.master_claim_id,
                        replacementClaimId: replacementClaim?.id,
                        replacementClaimText: replacementClaim?.claim_text,
                        replacementClaimType: replacementClaim?.claim_type,
                    },
                    description: replacementClaim?.description || (override.is_blocked ? "Blocked by override" : baseEffectiveClaim?.description),
                    isBlockedOverride: override.is_blocked,
                    isReplacementOverride: !!replacementClaim,
                    originalMasterClaimIdIfOverridden: masterClaimIdForCurrentContext, // Use the resolved ID
                    originalEffectiveClaimDetails: baseEffectiveClaim, 
                };
            } else if (baseEffectiveClaim && baseEffectiveClaim.original_claim_country_code === '__GLOBAL__') { // Global claim, not overridden
                finalMatrixCell = {
                    effectiveStatus: baseEffectiveClaim.final_claim_type,
                    effectiveClaimSourceLevel: baseEffectiveClaim.source_level,
                    sourceMasterClaimId: baseEffectiveClaim.source_claim_id, // It is a master claim
                    isActuallyMaster: true,
                    activeOverride: null,
                    description: baseEffectiveClaim.description,
                    isBlockedOverride: false,
                    isReplacementOverride: false,
                    originalMasterClaimIdIfOverridden: null,
                    originalEffectiveClaimDetails: baseEffectiveClaim,
                };
            } else if (baseEffectiveClaim) { // Non-global (market-specific) base claim, not subject to this override logic path
                 finalMatrixCell = {
                    effectiveStatus: baseEffectiveClaim.final_claim_type,
                    effectiveClaimSourceLevel: baseEffectiveClaim.source_level,
                    sourceMasterClaimId: null, // Not a master claim in the context of being overridden
                    isActuallyMaster: false,
                    activeOverride: null,
                    description: baseEffectiveClaim.description,
                    isBlockedOverride: false,
                    isReplacementOverride: false,
                    originalMasterClaimIdIfOverridden: null,
                    originalEffectiveClaimDetails: baseEffectiveClaim,
                };
            } else { // No base effective claim, and no global master to be overridden. 
                 finalMatrixCell = { effectiveStatus: 'none', isActuallyMaster: false, activeOverride: null, sourceMasterClaimId: null, originalEffectiveClaimDetails: null };
            }
        } else if (baseEffectiveClaim) { // Market-specific claim (no global context for override check)
            finalMatrixCell = {
                effectiveStatus: baseEffectiveClaim.final_claim_type,
                effectiveClaimSourceLevel: baseEffectiveClaim.source_level,
                sourceMasterClaimId: null, 
                isActuallyMaster: false, // It's market-specific, not master in the global sense
                activeOverride: null,
                description: baseEffectiveClaim.description,
                isBlockedOverride: false,
                isReplacementOverride: false,
                originalMasterClaimIdIfOverridden: null,
                originalEffectiveClaimDetails: baseEffectiveClaim,
            };
        } else { // No claims apply at all for this text and product.
            finalMatrixCell = { effectiveStatus: 'none', isActuallyMaster: false, activeOverride: null, sourceMasterClaimId: null, originalEffectiveClaimDetails: null };
        }
        cellData[currentClaimText][product.id] = finalMatrixCell;
      }
    }
    // ----- END OF COMPLEX LOGIC -----


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
