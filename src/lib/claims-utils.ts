import { createSupabaseAdminClient } from './supabase/client';

// Types mirroring database schema and API responses
// These might be better placed in a central types file (e.g., src/types/claims.ts) if used widely

export type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';
export type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

export interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  global_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string; // Can be '__GLOBAL__' or ISO country code
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  global_brand_id: string; 
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

export interface GlobalClaimBrand {
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

// Intermediate type for processing claims with priority
interface ClaimWithPriority extends Claim {
  _priority?: number;
}

/**
 * Fetches and stacks claims for a given product, considering its ingredients and brand,
 * applying precedence rules for country-specific and global claims.
 *
 * Precedence:
 * 1. Product-specific claims (country-specific > __GLOBAL__)
 * 2. Ingredient-specific claims (country-specific > __GLOBAL__) (merged from all ingredients)
 * 3. Brand-specific claims (country-specific > __GLOBAL__)
 *
 * A claim is considered unique by its `claim_text`. If multiple claims with the same text exist
 * after prioritization, only the highest priority one (based on the levels above) is kept.
 * Within the same level, a specific country code claim overrides a __GLOBAL__ claim.
 */
export async function getStackedClaimsForProduct(
  productId: string,
  countryCode: string // The specific country code to prioritize, e.g., "US"
): Promise<Claim[]> {
  const supabase = createSupabaseAdminClient();

  if (!productId) {
    console.error('[getStackedClaimsForProduct] Product ID is required.');
    return [];
  }
  if (!countryCode) {
    console.warn('[getStackedClaimsForProduct] Country code is not provided, will only fetch __GLOBAL__ claims effectively for country-specific prioritization.');
    // Or throw error: throw new Error('Country code is required.');
  }

  try {
    // 1. Fetch the product details to get its global_brand_id
    // @ts-ignore
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, global_brand_id')
      .eq('id', productId)
      .single<Product>();

    if (productError || !product) {
      console.error(`[getStackedClaimsForProduct] Error fetching product ${productId}:`, productError);
      // If product not found, cannot proceed meaningfully for product-specific claims
      // Depending on requirements, could still try to fetch brand/ingredient claims if they were passed differently
      // For now, returning empty if product is not found, as it's the primary entity.
      return [];
    }

    const globalBrandId = product.global_brand_id;

    // Helper to fetch claims for a given level and entity ID(s)
    const fetchClaimsForLevel = async (
      level: ClaimLevelEnum,
      entityIds: string[],
      targetCountryCode: string
    ): Promise<Claim[]> => {
      if (!entityIds || entityIds.length === 0) return [];

      const idColumn = level === 'product' ? 'product_id' :
                       level === 'ingredient' ? 'ingredient_id' :
                       'global_brand_id';
      
      // @ts-ignore
      const { data: fetchedClaims, error } = await supabase
        .from('claims')
        .select('*')
        .in(idColumn, entityIds)
        .in('country_code', [targetCountryCode, '__GLOBAL__'])
        .eq('level', level)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[getStackedClaimsForProduct] Error fetching ${level} claims for IDs ${entityIds.join(',')} & country ${targetCountryCode}:`, error);
        return [];
      }
      return (fetchedClaims as Claim[]) || [];
    };

    // 2. Fetch Product-specific claims
    const productClaims = await fetchClaimsForLevel('product', [productId], countryCode);

    // 3. Fetch Ingredients for the product
    // @ts-ignore
    const { data: productIngredientLinks, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select('ingredient_id')
      .eq('product_id', productId);

    let ingredientClaims: Claim[] = [];
    if (ingredientsError) {
      console.error(`[getStackedClaimsForProduct] Error fetching ingredients for product ${productId}:`, ingredientsError);
    } else if (productIngredientLinks && productIngredientLinks.length > 0) {
      const ingredientIds = productIngredientLinks.map((link: any) => link.ingredient_id);
      // 4. Fetch Ingredient-specific claims
      ingredientClaims = await fetchClaimsForLevel('ingredient', ingredientIds, countryCode);
    }

    // 5. Fetch Brand-specific claims
    let brandClaims: Claim[] = [];
    if (globalBrandId) {
      brandClaims = await fetchClaimsForLevel('brand', [globalBrandId], countryCode);
    }

    // 6. Merge and prioritize claims
    // Prioritization logic:
    // - Product specific (country > global) > Ingredient specific (country > global) > Brand specific (country > global)
    // - Uniqueness by claim_text

    const prioritizedClaims = new Map<string, ClaimWithPriority>();

    const processClaims = (claimsToProcess: Claim[], levelPriority: number) => {
      claimsToProcess.forEach(claim => {
        const existingClaim = prioritizedClaims.get(claim.claim_text);
        let currentClaimPriority = levelPriority;
        if (claim.country_code !== '__GLOBAL__' && claim.country_code === countryCode) {
            currentClaimPriority += 0.5; 
        }

        if (!existingClaim) {
          prioritizedClaims.set(claim.claim_text, { ...claim, _priority: currentClaimPriority });
        } else {
          let existingClaimPriority = existingClaim._priority || 0;
          
          if (currentClaimPriority > existingClaimPriority) {
            prioritizedClaims.set(claim.claim_text, { ...claim, _priority: currentClaimPriority });
          }
        }
      });
    };

    processClaims(productClaims, 3);
    processClaims(ingredientClaims, 2);
    processClaims(brandClaims, 1);
    
    const intermediateClaims: ClaimWithPriority[] = Array.from(prioritizedClaims.values());

    intermediateClaims.sort((a, b) => (b._priority || 0) - (a._priority || 0));
    
    return intermediateClaims.map(claimWithPriority => {
        const { _priority, ...rest } = claimWithPriority;
        return rest as Claim;
    });

  } catch (error) {
    console.error(`[getStackedClaimsForProduct] Unexpected error for product ${productId}, country ${countryCode}:`, error);
    return []; // Return empty on unexpected failure
  }
}

// Example usage (for testing, not part of the actual file usually)
/*
async function testStacking() {
  const productId = "your-product-id"; // replace with actual ID
  const countryCode = "US"; // replace with actual country
  console.log(`Fetching stacked claims for product ${productId} in ${countryCode}...`);
  const stackedClaims = await getStackedClaimsForProduct(productId, countryCode);
  console.log("Stacked Claims:", JSON.stringify(stackedClaims, null, 2));
}
// testStacking();
*/ 