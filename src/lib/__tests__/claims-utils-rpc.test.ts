import { getStackedClaimsForProductRPC } from '../claims-utils';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '../constants/claims';
import { createSupabaseAdminClient } from '../supabase/client';
import { logError } from '@/lib/logger';

jest.mock('../supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn(),
}));

describe('getStackedClaimsForProductRPC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves override metadata so dedupe prefers override rows', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          claim_text: 'Rich in protein',
          final_claim_type: 'allowed',
          source_level: 'product',
          source_claim_id: 'master-claim',
          original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
          is_master: true,
        },
        {
          claim_text: 'Rich in protein',
          final_claim_type: 'allowed',
          source_level: 'override',
          source_claim_id: 'replacement-claim',
          original_claim_country_code: 'US',
          is_replacement_override: true,
          override_rule_id: 'override-rule-1',
        },
      ],
      error: null,
    });

    (createSupabaseAdminClient as jest.Mock).mockReturnValue({ rpc });

    const result = await getStackedClaimsForProductRPC('product-123', 'US');

    expect(rpc).toHaveBeenCalledWith('get_effective_claims', {
      p_product_id: 'product-123',
      p_country_code: 'US',
    });

    expect(result).toHaveLength(1);
    expect(result[0].source_level).toBe('override');
    expect(result[0].override_rule_id).toBe('override-rule-1');
    expect(result[0].is_replacement_override).toBe(true);
  });

  it('short-circuits when required parameters are missing', async () => {
    const rpc = jest.fn();
    (createSupabaseAdminClient as jest.Mock).mockReturnValue({ rpc });

    expect(await getStackedClaimsForProductRPC('', 'US')).toEqual([]);
    expect(await getStackedClaimsForProductRPC('product-123', '')).toEqual([]);

    expect(rpc).not.toHaveBeenCalled();
    expect((logError as jest.Mock).mock.calls.length).toBe(2);
  });
});
