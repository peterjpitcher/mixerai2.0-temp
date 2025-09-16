import type { StyledClaims } from '@/types/claims';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';

interface RawClaim {
  id: string;
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: string;
  priority?: number;
  country_code: string;
}

/**
 * Formats raw claims into the StyledClaims structure without using AI
 * Preserves all original claim text exactly as provided
 */
export function formatClaimsDirectly(
  claims: RawClaim[],
  productName?: string,
  brandName?: string
): StyledClaims {
  // Filter out any null or invalid claims
  const validClaims = claims.filter(c => c && c.claim_text && c.claim_type && c.level);
  
  // Note: mandatory claims have been removed from the system
  
  // Group claims by level for better organization
  const levels = ['Product', 'Ingredient', 'Brand'];
  const groupedClaims = levels.map(level => {
    const levelClaims = validClaims.filter(
      c => c.level.toLowerCase() === level.toLowerCase()
    );
    
    return {
      level,
      allowed_claims: levelClaims
        .filter(c => c.claim_type === 'allowed')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .map(c => c.claim_text.trim()),
      disallowed_claims: levelClaims
        .filter(c => c.claim_type === 'disallowed')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .map(c => c.claim_text.trim())
    };
  });
  
  // Create a contextual introductory sentence
  let introductorySentence = 'Approved claims for';
  if (productName && brandName) {
    introductorySentence = `Approved claims for ${productName} by ${brandName}.`;
  } else if (productName) {
    introductorySentence = `Approved claims for ${productName}.`;
  } else if (brandName) {
    introductorySentence = `Approved claims for ${brandName} products.`;
  } else {
    introductorySentence = 'Approved claims for this product.';
  }
  
  return {
    introductory_sentence: introductorySentence,
    grouped_claims: groupedClaims
  };
}

/**
 * Removes duplicate claims while preserving the highest priority version
 */
export function deduplicateClaims(claims: RawClaim[]): RawClaim[] {
  const claimMap = new Map<string, RawClaim>();
  
  // Sort by priority (highest first) to ensure we keep the highest priority version
  const sortedClaims = [...claims].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  for (const claim of sortedClaims) {
    const key = `${claim.claim_text.trim().toLowerCase()}_${claim.claim_type}_${claim.level}`;
    if (!claimMap.has(key)) {
      claimMap.set(key, claim);
    }
  }
  
  return Array.from(claimMap.values());
}

/**
 * Filters claims by market (country code)
 * Global claims (__GLOBAL__) are always included
 */
export function filterClaimsByMarket(claims: RawClaim[], countryCode: string): RawClaim[] {
  return claims.filter(claim => 
    claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE || 
    claim.country_code === countryCode
  );
}

/**
 * Combines multiple claim sources with proper priority handling
 */
export function combineClaimSources(
  brandClaims: RawClaim[],
  productClaims: RawClaim[],
  ingredientClaims: RawClaim[]
): RawClaim[] {
  // Combine all claims
  const allClaims = [
    ...brandClaims,
    ...productClaims,
    ...ingredientClaims
  ];
  
  // Remove duplicates while preserving priority
  return deduplicateClaims(allClaims);
}
