import { createSupabaseAdminClient } from './supabase/client';
import { ALL_COUNTRIES_CODE, GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { logError, logDebug } from '@/lib/logger';

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
  replacement_claim?: Claim | null; // For when replacement claim is joined
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
    logError('[getStackedClaimsForProduct] Product ID is required.');
    return [];
  }
  if (!countryCode) {
    // It's crucial to have a country code, as overrides are market-specific.
    // And master claims need to be distinguishable from market claims.
    logError('[getStackedClaimsForProduct] Country code is required.');
    return [];
  }

  try {
    // 1. Fetch the product details to get its master_brand_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, master_brand_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      logError(`[getStackedClaimsForProduct] Error fetching product ${productId}:`, productError);
      return [];
    }

    const masterBrandId = product.master_brand_id;

    // Product-level claims via claim_products + claim_countries
    const fetchProductLevelClaims = async (pid: string): Promise<Claim[]> => {
      const { data: cps, error: cpErr } = await supabase
        .from('claim_products')
        .select('claim_id')
        .eq('product_id', pid);
      if (cpErr) { logError(`[getStackedClaimsForProduct] claim_products for ${pid}:`, cpErr); return []; }
      const claimIds = Array.from(new Set((cps || []).map((r: any) => r.claim_id)));
      if (!claimIds.length) return [];
      const { data: ccs, error: ccErr } = await supabase
        .from('claim_countries')
        .select('claim_id, country_code')
        .in('claim_id', claimIds)
        .in('country_code', [countryCode, GLOBAL_CLAIM_COUNTRY_CODE]);
      if (ccErr) { logError('[getStackedClaimsForProduct] claim_countries for product claims:', ccErr); return []; }
      const chosen = new Map<string, string>();
      (ccs || []).forEach((r: any) => {
        const prev = chosen.get(r.claim_id);
        if (!prev || prev === GLOBAL_CLAIM_COUNTRY_CODE || r.country_code === countryCode) chosen.set(r.claim_id, r.country_code);
      });
      const allowedIds = Array.from(chosen.keys());
      if (!allowedIds.length) return [];
      const { data: rows, error } = await supabase.from('claims').select('*').in('id', allowedIds).eq('level', 'product');
      if (error) { logError('[getStackedClaimsForProduct] claims fetch product-level:', error); return []; }
      return ((rows as Claim[]) || []).map(c => ({ ...c, country_code: chosen.get(c.id) || c.country_code }));
    };

    // Ingredient-level claims via claim_ingredients + claim_countries
    const fetchIngredientLevelClaims = async (ingredientIds: string[]): Promise<Claim[]> => {
      if (!ingredientIds.length) return [];
      const { data: cis, error: ciErr } = await supabase
        .from('claim_ingredients')
        .select('claim_id')
        .in('ingredient_id', ingredientIds);
      if (ciErr) { logError('[getStackedClaimsForProduct] claim_ingredients:', ciErr); return []; }
      const claimIds = Array.from(new Set((cis || []).map((r: any) => r.claim_id)));
      if (!claimIds.length) return [];
      const { data: ccs, error: ccErr } = await supabase
        .from('claim_countries')
        .select('claim_id, country_code')
        .in('claim_id', claimIds)
        .in('country_code', [countryCode, GLOBAL_CLAIM_COUNTRY_CODE]);
      if (ccErr) { logError('[getStackedClaimsForProduct] claim_countries for ingredient claims:', ccErr); return []; }
      const chosen = new Map<string, string>();
      (ccs || []).forEach((r: any) => {
        const prev = chosen.get(r.claim_id);
        if (!prev || prev === GLOBAL_CLAIM_COUNTRY_CODE || r.country_code === countryCode) chosen.set(r.claim_id, r.country_code);
      });
      const allowedIds = Array.from(chosen.keys());
      if (!allowedIds.length) return [];
      const { data: rows, error } = await supabase.from('claims').select('*').in('id', allowedIds).eq('level', 'ingredient');
      if (error) { logError('[getStackedClaimsForProduct] claims fetch ingredient-level:', error); return []; }
      return ((rows as Claim[]) || []).map(c => ({ ...c, country_code: chosen.get(c.id) || c.country_code }));
    };

    // Brand-level claims filtered by claim_countries
    const fetchBrandLevelClaims = async (brandId: string): Promise<Claim[]> => {
      const { data: rows, error } = await supabase
        .from('claims')
        .select('id, claim_text, claim_type, level, master_brand_id, product_id, ingredient_id, country_code, description, created_by, created_at, updated_at')
        .eq('master_brand_id', brandId)
        .eq('level', 'brand');
      if (error) { logError('[getStackedClaimsForProduct] claims fetch brand-level:', error); return []; }
      const claims = (rows as Claim[]) || [];
      if (!claims.length) return [];
      const ids = claims.map(c => c.id);
      const { data: ccs, error: ccErr } = await supabase
        .from('claim_countries')
        .select('claim_id, country_code')
        .in('claim_id', ids);
      if (ccErr) { logError('[getStackedClaimsForProduct] claim_countries for brand claims:', ccErr); return []; }
      const countryMap = new Map<string, string[]>();
      (ccs || []).forEach((r: any) => {
        const list = countryMap.get(r.claim_id) || [];
        list.push(r.country_code);
        countryMap.set(r.claim_id, list);
      });
      return claims.filter(c => {
        const list = countryMap.get(c.id) || (c.country_code ? [c.country_code] : []);
        return list.includes(countryCode) || list.includes(GLOBAL_CLAIM_COUNTRY_CODE);
      }).map(c => {
        const list = countryMap.get(c.id) || (c.country_code ? [c.country_code] : []);
        const chosen = list.includes(countryCode) ? countryCode : (list.includes(GLOBAL_CLAIM_COUNTRY_CODE) ? GLOBAL_CLAIM_COUNTRY_CODE : c.country_code);
        return { ...c, country_code: chosen || c.country_code };
      });
    };

    // 2. Fetch Product-specific claims via junctions
    const productClaims = await fetchProductLevelClaims(productId);

    // 3. Fetch Ingredients for the product
    const { data: productIngredientLinks, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select('ingredient_id')
      .eq('product_id', productId);

    let ingredientClaims: Claim[] = [];
    if (ingredientsError) {
      logError(`[getStackedClaimsForProduct] Error fetching ingredients for product ${productId}:`, ingredientsError);
    } else if (productIngredientLinks && productIngredientLinks.length > 0) {
      const ingredientIds = productIngredientLinks.map((link: { ingredient_id: string }) => link.ingredient_id);
      // 4. Fetch Ingredient-specific claims via junctions
      ingredientClaims = await fetchIngredientLevelClaims(ingredientIds);
    }

    // 5. Fetch Brand-specific claims filtered by country
    let brandClaims: Claim[] = [];
    if (masterBrandId) {
      brandClaims = await fetchBrandLevelClaims(masterBrandId);
    }

    // 6. Fetch Market Claim Overrides for this product and country (including global overrides)
    const { data: marketOverridesData, error: overridesError } = await supabase
        .from('market_claim_overrides')
        .select('*, replacement_claim:claims!replacement_claim_id(*)') // Eager load replacement claim details
        .eq('target_product_id', productId)
        .in('market_country_code', [countryCode, ALL_COUNTRIES_CODE]); // Include global overrides

    if (overridesError) {
        logError(`[getStackedClaimsForProduct] Error fetching market overrides for product ${productId}, country ${countryCode}:`, overridesError);
        // Continue, but overrides won't apply
    }
    const marketOverrides: MarketClaimOverride[] = (marketOverridesData as MarketClaimOverride[]) || [];
    
    // Build a fast override map per master_claim_id, prefer market-specific over global
    const overrideByMasterId = new Map<string, MarketClaimOverride>();
    for (const o of marketOverrides) {
      const existing = overrideByMasterId.get(o.master_claim_id);
      if (!existing) {
        overrideByMasterId.set(o.master_claim_id, o);
      } else if (existing.market_country_code === ALL_COUNTRIES_CODE && o.market_country_code === countryCode) {
        overrideByMasterId.set(o.master_claim_id, o);
      }
    }


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

        const masterClaimIdForOverrideCheck = claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE ? claim.id : null;
        let isOverridden = false;
        let overrideApplied: MarketClaimOverride | undefined = undefined;

        if (masterClaimIdForOverrideCheck) {
            overrideApplied = overrideByMasterId.get(masterClaimIdForOverrideCheck);
            
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
                        description: overrideApplied.market_country_code === ALL_COUNTRIES_CODE 
                            ? `Master claim "${claim.claim_text}" blocked globally for product ${productId}.`
                            : `Master claim "${claim.claim_text}" blocked in ${countryCode} for product ${productId}.`,
                        applies_to_product_id: productId,
                        applies_to_country_code: countryCode,
                        original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE, // Master claims are global
                    });
                } else if (overrideApplied.replacement_claim_id) {
                    const replacementClaim = (overrideApplied as any).replacement_claim as Claim | null;
                    if (replacementClaim) {
                        effectiveClaimsMap.set(claim.claim_text, {
                            claim_text: replacementClaim.claim_text, // Could be different text if replacement changes it, though unusual for override
                            final_claim_type: replacementClaim.claim_type,
                            source_level: 'override',
                            source_claim_id: replacementClaim.id, // ID of the replacement claim
                            original_master_claim_id_if_overridden: masterClaimIdForOverrideCheck,
                            is_replacement_override: true,
                            isActuallyMaster: false,
                            description: replacementClaim.description || (overrideApplied.market_country_code === ALL_COUNTRIES_CODE 
                                ? `Master claim "${claim.claim_text}" replaced globally by "${replacementClaim.claim_text}".`
                                : `Master claim "${claim.claim_text}" replaced by "${replacementClaim.claim_text}" in ${countryCode}.`),
                            applies_to_product_id: productId,
                            applies_to_country_code: countryCode,
                            original_claim_country_code: replacementClaim.country_code, // Country of the replacement claim
                            source_entity_id: replacementClaim.product_id || replacementClaim.ingredient_id || replacementClaim.master_brand_id,
                        });
                    } else {
                         // This case should be rare if DB constraints are good (replacement_claim_id FK)
                        logError(`[getStackedClaimsForProduct] Override ${overrideApplied.id} specified a replacement_claim_id ${overrideApplied.replacement_claim_id} but it was not found.`);
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
                            original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
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
                applies_to_country_code: countryCode,
                original_claim_country_code: claim.country_code,
                source_entity_id: entityIdForSource,
                isActuallyMaster: claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE,
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
    
    const preliminary = Array.from(effectiveClaimsMap.values());
    const result = dedupeByFinalText(preliminary);
    logDebug('[stacked-claims:compose]', { productId, countryCode, inCount: preliminary.length, outCount: result.length });
    return result;

  } catch (error) {
    logError(`[getStackedClaimsForProduct] Unexpected error for product ${productId}, country ${countryCode}:`, error);
    return []; // Return empty on unexpected failure
  }
}

// Helper: check if a given country code is global
export const isGlobalCountryCode = (code?: string | null) => code === GLOBAL_CLAIM_COUNTRY_CODE;

type SourceLevel = 'product' | 'ingredient' | 'brand' | 'override' | 'none';
type Precedence = 1 | 2 | 3;

const levelScore = (lvl: SourceLevel) => ({ product: 3, ingredient: 2, brand: 1, override: 4, none: 0 }[lvl] || 0);

const precedenceOf = (ec: EffectiveClaim): Precedence => {
  const overridden = (ec as any).is_blocked_override || (ec as any).is_replacement_override;
  if (overridden) return 1; // Override highest
  if (ec.original_claim_country_code && ec.original_claim_country_code !== GLOBAL_CLAIM_COUNTRY_CODE) return 2; // Market
  return 3; // Master
};

export function dedupeByFinalText(rows: EffectiveClaim[]): EffectiveClaim[] {
  const keep = new Map<string, EffectiveClaim>();
  for (const ec of rows) {
    const key = (ec.claim_text || '').trim().toLowerCase();
    const existing = keep.get(key);
    if (!existing) {
      keep.set(key, ec);
      continue;
    }
    const a = { p: precedenceOf(existing), s: levelScore((existing.source_level as SourceLevel) || 'none') };
    const b = { p: precedenceOf(ec),       s: levelScore((ec.source_level as SourceLevel) || 'none') };
    // Lower precedence number wins. Break ties by higher level score.
    if (b.p < a.p || (b.p === a.p && b.s > a.s)) keep.set(key, ec);
  }
  return Array.from(keep.values());
}

// Optional: RPC-based stacking (one-shot DB call)
export async function getStackedClaimsForProductRPC(productId: string, countryCode: string): Promise<EffectiveClaim[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any).rpc('get_effective_claims', {
    p_product_id: productId,
    p_country_code: countryCode,
  });
  if (error) {
    logError('[getStackedClaimsForProductRPC] RPC error', error);
    return [];
  }
  // data may not include overrides flags; perform dedupe if needed
  const rows = (data as any[] | null) ?? [];
  const mapped: EffectiveClaim[] = rows.map((r) => ({
    source_claim_id: r.source_claim_id ?? null,
    source_level: r.source_level ?? 'none',
    original_claim_country_code: r.original_claim_country_code ?? null,
    final_claim_type: r.final_claim_type ?? 'none',
    claim_text: r.claim_text ?? '',
    isActuallyMaster: !!r.is_master,
    applies_to_product_id: productId,
    applies_to_country_code: countryCode,
  }));
  return dedupeByFinalText(mapped);
}

// Example usage (for testing, not part of the actual file usually)
/*
async function testStacking() {
  // Ensure you have a Supabase client instance or initialize one for testing
  // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const productId = "your-product-id"; // replace with actual PRODUCT ID that exists
  const countryCode = "US"; // replace with actual country or use GLOBAL_CLAIM_COUNTRY_CODE to test global context
  
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
