import { normalizeSingleRow, dedupeByFinalText, EffectiveClaim } from '@/lib/claims-utils';
import { ClaimLevelEnum, FinalClaimTypeEnum } from '@/lib/claims-utils';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';

describe('normalizeSingleRow', () => {
  it('should return the single element if input is an array with one element', () => {
    expect(normalizeSingleRow([1])).toBe(1);
    expect(normalizeSingleRow(['test'])).toBe('test');
    expect(normalizeSingleRow([{ id: 1 }])).toEqual({ id: 1 });
  });

  it('should return the first element if input is an array with multiple elements', () => {
    expect(normalizeSingleRow([1, 2, 3])).toBe(1);
  });

  it('should return the value itself if input is not an array', () => {
    expect(normalizeSingleRow(1)).toBe(1);
    expect(normalizeSingleRow('test')).toBe('test');
    expect(normalizeSingleRow({ id: 1 })).toEqual({ id: 1 });
  });

  it('should return null if input is null or undefined', () => {
    expect(normalizeSingleRow(null)).toBeNull();
    expect(normalizeSingleRow(undefined)).toBeNull();
  });

  it('should return null if input is an empty array', () => {
    expect(normalizeSingleRow([])).toBeNull();
  });
});

describe('dedupeByFinalText', () => {
  const baseClaim: EffectiveClaim = {
    claim_text: 'Base claim',
    final_claim_type: 'allowed',
    source_level: 'brand',
    source_claim_id: 'claim-1',
    applies_to_product_id: 'product-1',
    applies_to_country_code: 'US',
    original_claim_country_code: 'US',
    isActuallyMaster: false,
    original_claim_text: 'Base claim original',
    description: null,
    override_rule_id: null,
    source_entity_id: null,
  };

  it('should return unique claims based on claim_text', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Unique claim 1' },
      { ...baseClaim, claim_text: 'Unique claim 2' },
      { ...baseClaim, claim_text: 'Unique claim 1' }, // Duplicate
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(2);
    expect(result.some(c => c.claim_text === 'Unique claim 1')).toBe(true);
    expect(result.some(c => c.claim_text === 'Unique claim 2')).toBe(true);
  });

  it('should prioritize blocked overrides', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Test Claim', final_claim_type: 'allowed', is_blocked_override: false },
      { ...baseClaim, claim_text: 'Test Claim', final_claim_type: 'none', is_blocked_override: true, source_level: 'override' },
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    expect(result[0].is_blocked_override).toBe(true);
    expect(result[0].final_claim_type).toBe('none');
  });

  it('should prioritize replacement overrides', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Replaced Claim', final_claim_type: 'allowed' },
      { ...baseClaim, claim_text: 'Replaced Claim', final_claim_type: 'mandatory', is_replacement_override: true, source_level: 'override' },
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    expect(result[0].is_replacement_override).toBe(true);
    expect(result[0].final_claim_type).toBe('mandatory');
  });

  it('should prioritize market-specific claims over global claims', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Geo Claim', original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE, isActuallyMaster: true, source_level: 'brand' },
      { ...baseClaim, claim_text: 'Geo Claim', original_claim_country_code: 'US', isActuallyMaster: false, source_level: 'brand' },
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    expect(result[0].original_claim_country_code).toBe('US');
  });

  it('should prioritize higher source levels when other priorities are equal', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Level Claim', source_level: 'brand', original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE },
      { ...baseClaim, claim_text: 'Level Claim', source_level: 'ingredient', original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE },
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    expect(result[0].source_level).toBe('ingredient');
  });

  it('should maintain stable order for identical claims with no priority difference', () => {
    const claimA = { ...baseClaim, claim_text: 'Stable Claim', source_level: 'brand' as ClaimLevelEnum, source_claim_id: 'a' };
    const claimB = { ...baseClaim, claim_text: 'Stable Claim', source_level: 'brand' as ClaimLevelEnum, source_claim_id: 'b' };
    const claims = [claimA, claimB] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    // The order should be stable, first one encountered if priorities are identical
    expect(result[0].source_claim_id).toBe('a'); 
  });

  it('should handle claims with null/empty text gracefully', () => {
    const claims = [
      { ...baseClaim, claim_text: '' },
      { ...baseClaim, claim_text: 'Valid Claim' },
      { ...baseClaim, claim_text: null },
    ] as unknown as EffectiveClaim[]; // Allow null claim_text for this specific test
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(2); // '' and null are treated as distinct due to fallbackKey if no other priority
  });

  it('should prioritize blocked override over replacement override when both exist for same claim text', () => {
    const claims = [
      { ...baseClaim, claim_text: 'Complex Claim', final_claim_type: 'allowed' },
      { ...baseClaim, claim_text: 'Complex Claim', final_claim_type: 'none', is_blocked_override: true, source_level: 'override' },
      { ...baseClaim, claim_text: 'Complex Claim', final_claim_type: 'mandatory', is_replacement_override: true, source_level: 'override' },
    ] as EffectiveClaim[];
    const result = dedupeByFinalText(claims);
    expect(result.length).toBe(1);
    expect(result[0].is_blocked_override).toBe(true);
  });
});