import { createSupabaseAdminClient } from './supabase/client';

// Types mirroring database schema and API responses
// These might be better placed in a central types file (e.g., src/types/claims.ts) if used widely

export type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory' | 'conditional';
export type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';
export type FinalClaimTypeEnum = ClaimTypeEnum | 'none'; // 'none' if no claim applies or it's blocked without replacement

export interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  master_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string | null; // Changed to string | null
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null; // Changed to string | null
  updated_at?: string | null; // Changed to string | null
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  master_brand_id: string; 
  created_at?: string;
  updated_at?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterClaimBrand {
  id: string;
  name: string;
  mixerai_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductIngredientAssociation {
  product_id: string;
  ingredient_id: string;
  created_at?: string;
}

// New interface for the resolved effective claim
export interface EffectiveClaim {
  claim_text: string;
  final_claim_type: FinalClaimTypeEnum;
  source_level: ClaimLevelEnum | 'override' | 'none'; // 'none' if no claim applies
  source_claim_id?: string | null; // ID of the claim that determined the final_claim_type
  original_master_claim_id_if_overridden?: string | null; // If overridden, the ID of the master claim
  is_blocked_override?: boolean; // True if a master claim was blocked by an override
  is_replacement_override?: boolean; // True if a master claim was replaced by an override
  isActuallyMaster?: boolean; // ADDED: True if this effective claim originates from a non-overridden master claim
  description?: string | null; // Description from the source claim
  applies_to_product_id: string;
  applies_to_country_code: string;
  original_claim_country_code?: string | null | undefined; // Changed to allow null
  source_entity_id?: string | null; // ID of the product, ingredient, or brand from the source claim
}

// Interface for market_claim_overrides table rows
export interface MarketClaimOverride {
  id: string;
  master_claim_id: string;
  market_country_code: string;
  target_product_id: string;
  is_blocked: boolean;
  replacement_claim_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Intermediate type for processing claims with priority
interface ClaimWithPriority extends Claim {
  _priority?: number; // Higher is better
  _isMarketSpecific?: boolean;
}

/**
 * Fetches and stacks claims for a given product, considering its ingredients, brand,
 * and market-specific overrides. It applies precedence rules to determine the
 * final effective claim for each unique claim text.
 *
 * Precedence for a given claim_text:
 * 1. Market-specific Override (block or replacement for the product in the target market)
 * 2. Market-specific Product Claim (for the product in the target market)
 * 3. Market-specific Ingredient Claim (for product's ingredients in the target market)
 * 4. Market-specific Brand Claim (for product's brand in the target market)
 * 5. Master (__GLOBAL__) Product Claim (unless overridden)
 * 6. Master (__GLOBAL__) Ingredient Claim (unless overridden)
 * 7. Master (__GLOBAL__) Brand Claim (unless overridden)
 *
 * A claim is considered unique by its `claim_text`.
 */
export async function getStackedClaimsForProduct(
  productId: string,
  countryCode: string // The specific country code to prioritize, e.g., "US"
): Promise<EffectiveClaim[]> {
  const supabase = createSupabaseAdminClient();

  if (!productId) {
    console.error('[getStackedClaimsForProduct] Product ID is required.');
    return [];
  }
  if (!countryCode) {
    // It's crucial to have a country code, as overrides are market-specific.
    // And master claims need to be distinguishable from market claims.
    console.error('[getStackedClaimsForProduct] Country code is required.');
    return [];
  }

  try {
    // 1. Fetch the product details to get its master_brand_id
    // @ts-ignore
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, master_brand_id')
      .eq('id', productId)
      .single<Product>();

    if (productError || !product) {
      console.error(`[getStackedClaimsForProduct] Error fetching product ${productId}:`, productError);
      return [];
    }

    const masterBrandId = product.master_brand_id;

    // Helper to fetch claims for a given level and entity ID(s)
    // Now fetches both country-specific and __GLOBAL__ claims together for easier processing later
    const fetchClaimsForLevel = async (
      level: ClaimLevelEnum,
      entityIds: string[]
    ): Promise<Claim[]> => {
      if (!entityIds || entityIds.length === 0) return [];

      const idColumn = level === 'product' ? 'product_id' :
                       level === 'ingredient' ? 'ingredient_id' :
                       'master_brand_id';
      
      // @ts-ignore
      const { data: fetchedClaims, error } = await supabase
        .from('claims')
        .select('*')
        .in(idColumn, entityIds)
        .in('country_code', [countryCode, '__GLOBAL__']) // Fetch both market-specific and global
        .eq('level', level)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[getStackedClaimsForProduct] Error fetching ${level} claims for IDs ${entityIds.join(',')} & country ${countryCode} / __GLOBAL__:`, error);
        return [];
      }
      return (fetchedClaims as Claim[]) || [];
    };

    // 2. Fetch Product-specific claims (Master & Market)
    const productClaims = await fetchClaimsForLevel('product', [productId]);

    // 3. Fetch Ingredients for the product
    const { data: productIngredientLinks, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select('ingredient_id')
      .eq('product_id', productId);

    let ingredientClaims: Claim[] = [];
    if (ingredientsError) {
      console.error(`[getStackedClaimsForProduct] Error fetching ingredients for product ${productId}:`, ingredientsError);
    } else if (productIngredientLinks && productIngredientLinks.length > 0) {
      const ingredientIds = productIngredientLinks.map((link: { ingredient_id: string }) => link.ingredient_id);
      // 4. Fetch Ingredient-specific claims (Master & Market)
      ingredientClaims = await fetchClaimsForLevel('ingredient', ingredientIds);
    }

    // 5. Fetch Brand-specific claims (Master & Market)
    let brandClaims: Claim[] = [];
    if (masterBrandId) {
      brandClaims = await fetchClaimsForLevel('brand', [masterBrandId]);
    }

    // 6. Fetch Market Claim Overrides for this product and country
    // @ts-ignore
    const { data: marketOverridesData, error: overridesError } = await supabase
        .from('market_claim_overrides')
        .select('*, replacement_claim:claims!replacement_claim_id(*)') // Eager load replacement claim details
        .eq('target_product_id', productId)
        .eq('market_country_code', countryCode);

    if (overridesError) {
        console.error(`[getStackedClaimsForProduct] Error fetching market overrides for product ${productId}, country ${countryCode}:`, overridesError);
        // Continue, but overrides won't apply
    }
    const marketOverrides: MarketClaimOverride[] = (marketOverridesData as any[]) || [];


    // 7. Consolidate and determine effective claims
    const allFetchedClaims: Claim[] = [...productClaims, ...ingredientClaims, ...brandClaims];
    const effectiveClaimsMap = new Map<string, EffectiveClaim>();

    // Assign priorities: Market > Global, Product > Ingredient > Brand
    // Market Override has highest priority.
    const getPriority = (claim: Claim, claimLevel: ClaimLevelEnum): number => {
        let priority = 0;
        if (claim.country_code === countryCode) priority += 100; // Market-specific is higher

        if (claimLevel === 'product') priority += 30;
        else if (claimLevel === 'ingredient') priority += 20;
        else if (claimLevel === 'brand') priority += 10;
        
        return priority;
    };
    
    // Sort all claims by text, then by priority (desc) to process higher priority ones first for a given text
    const sortedClaims: ClaimWithPriority[] = allFetchedClaims.map(c => {
        let level: ClaimLevelEnum = 'brand'; // Default, will be overridden
        if (c.product_id) level = 'product';
        else if (c.ingredient_id) level = 'ingredient';
        else if (c.master_brand_id) level = 'brand';
        
        return {
            ...c,
            _priority: getPriority(c, level),
            _isMarketSpecific: c.country_code === countryCode,
        };
    }).sort((a, b) => {
        if (a.claim_text < b.claim_text) return -1;
        if (a.claim_text > b.claim_text) return 1;
        return (b._priority || 0) - (a._priority || 0); // Higher priority first
    });


    for (const claim of sortedClaims) {
        if (effectiveClaimsMap.has(claim.claim_text)) {
            // Already processed a higher or equally high priority claim for this text
            continue;
        }

        const masterClaimIdForOverrideCheck = claim.country_code === '__GLOBAL__' ? claim.id : null;
        let isOverridden = false;
        let overrideApplied: MarketClaimOverride | undefined = undefined;

        if (masterClaimIdForOverrideCheck) {
            overrideApplied = marketOverrides.find(ovr => ovr.master_claim_id === masterClaimIdForOverrideCheck);
            if (overrideApplied) {
                isOverridden = true;
                if (overrideApplied.is_blocked && !overrideApplied.replacement_claim_id) {
                    effectiveClaimsMap.set(claim.claim_text, {
                        claim_text: claim.claim_text,
                        final_claim_type: 'none', // Blocked means no claim
                        source_level: 'override',
                        source_claim_id: overrideApplied.id, // ID of the override rule
                        original_master_claim_id_if_overridden: masterClaimIdForOverrideCheck,
                        is_blocked_override: true,
                        isActuallyMaster: false,
                        description: `Master claim "${claim.claim_text}" blocked in ${countryCode} for product ${productId}.`,
                        applies_to_product_id: productId,
                        applies_to_country_code: countryCode,
                        original_claim_country_code: '__GLOBAL__', // Master claims are global
                    });
                } else if (overrideApplied.replacement_claim_id) {
                    // @ts-ignore - replacement_claim is joined
                    const replacementClaim = overrideApplied.replacement_claim as Claim | null;
                    if (replacementClaim) {
                        effectiveClaimsMap.set(claim.claim_text, {
                            claim_text: replacementClaim.claim_text, // Could be different text if replacement changes it, though unusual for override
                            final_claim_type: replacementClaim.claim_type,
                            source_level: 'override',
                            source_claim_id: replacementClaim.id, // ID of the replacement claim
                            original_master_claim_id_if_overridden: masterClaimIdForOverrideCheck,
                            is_replacement_override: true,
                            isActuallyMaster: false,
                            description: replacementClaim.description || `Master claim "${claim.claim_text}" replaced by "${replacementClaim.claim_text}" in ${countryCode}.`,
                            applies_to_product_id: productId,
                            applies_to_country_code: countryCode,
                            original_claim_country_code: replacementClaim.country_code, // Country of the replacement claim
                            source_entity_id: replacementClaim.product_id || replacementClaim.ingredient_id || replacementClaim.master_brand_id,
                        });
                    } else {
                         // This case should be rare if DB constraints are good (replacement_claim_id FK)
                        console.warn(`[getStackedClaimsForProduct] Override ${overrideApplied.id} specified a replacement_claim_id ${overrideApplied.replacement_claim_id} but it was not found.`);
                         effectiveClaimsMap.set(claim.claim_text, {
                            claim_text: claim.claim_text,
                            final_claim_type: 'none', 
                            source_level: 'override',
                            source_claim_id: overrideApplied.id,
                            original_master_claim_id_if_overridden: masterClaimIdForOverrideCheck,
                            is_blocked_override: true, // Treat as blocked if replacement is missing
                            isActuallyMaster: false,
                            description: `Master claim "${claim.claim_text}" intended for replacement in ${countryCode} but replacement claim missing. Considered blocked.`,
                            applies_to_product_id: productId,
                            applies_to_country_code: countryCode,
                            original_claim_country_code: '__GLOBAL__',
                        });
                    }
                }
                // If overridden, we don't process the original master claim further for this claim_text
                continue; 
            }
        }

        // If not overridden (or if it's a market-specific claim which cannot be overridden by this table's logic)
        // or if it is a master claim that had no override rule.
        if (!isOverridden) {
             let sourceLevel: ClaimLevelEnum = 'brand'; // Default
             if (claim.product_id) sourceLevel = 'product';
             else if (claim.ingredient_id) sourceLevel = 'ingredient';
            
             let entityIdForSource: string | null = null;
             if (sourceLevel === 'product' && claim.product_id) {
                entityIdForSource = claim.product_id;
             } else if (sourceLevel === 'ingredient' && claim.ingredient_id) {
                entityIdForSource = claim.ingredient_id;
             } else if (sourceLevel === 'brand' && claim.master_brand_id) {
                entityIdForSource = claim.master_brand_id;
             }

            effectiveClaimsMap.set(claim.claim_text, {
                claim_text: claim.claim_text,
                final_claim_type: claim.claim_type,
                source_level: sourceLevel,
                source_claim_id: claim.id,
                description: claim.description,
                applies_to_product_id: productId,
                applies_to_country_code: countryCode, // or claim.country_code if we want to show __GLOBAL__
                original_claim_country_code: claim.country_code,
                source_entity_id: entityIdForSource,
                isActuallyMaster: true,
            });
        }
    }
    
    // Also consider market overrides that might introduce completely NEW claim texts
    // via a replacement_claim_id, where the master_claim_id's text was not among existing claims.
    // This is less common (override usually targets an existing master claim text) but possible if master_claim_id was deleted.
    // For now, this is implicitly handled if replacement_claim_id's claim_text is unique.
    // If replacement_claim_id has a text that *matches* another, existing claim text, the logic above needs to be robust.
    // The current sort and `effectiveClaimsMap.has` check should handle this:
    // If a replacement override introduces a claim, its `claim_text` will be added to the map.
    // If another, lower-priority claim has the same text, it will be skipped.
    
    return Array.from(effectiveClaimsMap.values());

  } catch (error) {
    console.error(`[getStackedClaimsForProduct] Unexpected error for product ${productId}, country ${countryCode}:`, error);
    return []; // Return empty on unexpected failure
  }
}

// Example usage (for testing, not part of the actual file usually)
/*
async function testStacking() {
  // Ensure you have a Supabase client instance or initialize one for testing
  // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const productId = "your-product-id"; // replace with actual PRODUCT ID that exists
  const countryCode = "US"; // replace with actual country or use '__GLOBAL__' to test global context
  
  if (productId === "your-product-id") {
    console.warn("Please replace 'your-product-id' with an actual product ID for testing.");
    return;
  }

  console.log(`Fetching stacked claims for product ${productId} in ${countryCode}...`);
  try {
    const stackedClaims = await getStackedClaimsForProduct(productId, countryCode);
    console.log("Stacked Claims:", JSON.stringify(stackedClaims, null, 2));
  } catch (e) {
    console.error("Error during testStacking:", e);
  }
}
// testStacking(); // Uncomment and run with `node -r esm src/lib/claims-utils.js` (approx) or via a test runner
*/ 