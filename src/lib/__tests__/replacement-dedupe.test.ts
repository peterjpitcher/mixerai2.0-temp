import { dedupeByFinalText, type EffectiveClaim } from '../claims-utils';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '../constants/claims';

describe('dedupeByFinalText', () => {
  test('keeps single row when replacement collides with existing text', () => {
    const rows: EffectiveClaim[] = [
      {
        claim_text: '100% whole grain',
        final_claim_type: 'allowed',
        source_level: 'brand',
        source_claim_id: 'm1',
        description: null,
        applies_to_product_id: 'p1',
        applies_to_country_code: 'GB',
        original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
        isActuallyMaster: true,
      } as any,
      {
        claim_text: '100% whole grain',
        final_claim_type: 'allowed',
        source_level: 'override',
        source_claim_id: 'r1',
        description: 'override replacement',
        applies_to_product_id: 'p1',
        applies_to_country_code: 'GB',
        original_claim_country_code: 'GB',
        isActuallyMaster: false,
        is_replacement_override: true,
      } as any,
    ];

    const out = dedupeByFinalText(rows);
    expect(out).toHaveLength(1);
    expect(out[0].source_level).toBe('override');
  });

  test('prefers market base over master when same final text', () => {
    const rows: EffectiveClaim[] = [
      {
        claim_text: 'High Fiber',
        final_claim_type: 'allowed',
        source_level: 'brand',
        source_claim_id: 'm2',
        description: null,
        applies_to_product_id: 'p1',
        applies_to_country_code: 'GB',
        original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
        isActuallyMaster: true,
      } as any,
      {
        claim_text: 'High Fiber',
        final_claim_type: 'allowed',
        source_level: 'product',
        source_claim_id: 'c1',
        description: null,
        applies_to_product_id: 'p1',
        applies_to_country_code: 'GB',
        original_claim_country_code: 'GB',
        isActuallyMaster: false,
      } as any,
    ];
    const out = dedupeByFinalText(rows);
    expect(out).toHaveLength(1);
    expect(out[0].source_level).toBe('product');
  });
});

