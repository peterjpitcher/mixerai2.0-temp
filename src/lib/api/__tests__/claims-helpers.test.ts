import { checkProductClaimsPermission } from '../claims-helpers';

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

const { createSupabaseAdminClient } = jest.requireMock('@/lib/supabase/client');

type QueryResult<T> = { data: T | null; error: any | null };

const createQueryStub = <T>(result: QueryResult<T>) => {
  return {
    select: jest.fn(function () {
      return this;
    }),
    in: jest.fn(async () => result),
    eq: jest.fn(function () {
      return this;
    }),
  };
};

describe('checkProductClaimsPermission', () => {
  const userId = 'user-123';
  const productIds = ['prod-1'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when user has admin access to all linked brands', async () => {
    const productsQuery = createQueryStub({
      data: [{ id: 'prod-1', master_brand_id: 'master-1' }],
      error: null,
    });
    const brandMappingsQuery = createQueryStub({
      data: [{ id: 'master-1', mixerai_brand_id: 'brand-1' }],
      error: null,
    });
    const permissionsQuery = createQueryStub({
      data: [{ brand_id: 'brand-1' }],
      error: null,
    });

    (createSupabaseAdminClient as jest.Mock).mockReturnValue({
      from: (table: string) => {
        switch (table) {
          case 'products':
            return productsQuery;
          case 'master_claim_brands':
            return brandMappingsQuery;
          case 'user_brand_permissions':
            return permissionsQuery;
          default:
            throw new Error(`Unexpected table ${table}`);
        }
      },
    });

    const result = await checkProductClaimsPermission(userId, productIds);

    expect(result).toEqual({ hasPermission: true, errors: [] });
    expect(productsQuery.select).toHaveBeenCalled();
    expect(brandMappingsQuery.select).toHaveBeenCalled();
    expect(permissionsQuery.select).toHaveBeenCalledWith('brand_id');
  });

  it('fails when a master brand lacks MixerAI mapping', async () => {
    const productsQuery = createQueryStub({
      data: [{ id: 'prod-1', master_brand_id: 'master-1' }],
      error: null,
    });
    const brandMappingsQuery = createQueryStub({ data: [], error: null });
    const permissionsQuery = createQueryStub({ data: [], error: null });

    (createSupabaseAdminClient as jest.Mock).mockReturnValue({
      from: (table: string) => {
        switch (table) {
          case 'products':
            return productsQuery;
          case 'master_claim_brands':
            return brandMappingsQuery;
          case 'user_brand_permissions':
            return permissionsQuery;
          default:
            throw new Error(`Unexpected table ${table}`);
        }
      },
    });

    const result = await checkProductClaimsPermission(userId, productIds);

    expect(result.hasPermission).toBe(false);
    expect(result.errors[0]).toContain('Brands missing MixerAI brand mapping');
  });

  it('fails when product list contains unknown ids', async () => {
    const productsQuery = createQueryStub({ data: [], error: null });
    const brandMappingsQuery = createQueryStub({ data: [], error: null });
    const permissionsQuery = createQueryStub({ data: [], error: null });

    (createSupabaseAdminClient as jest.Mock).mockReturnValue({
      from: (table: string) => {
        switch (table) {
          case 'products':
            return productsQuery;
          case 'master_claim_brands':
            return brandMappingsQuery;
          case 'user_brand_permissions':
            return permissionsQuery;
          default:
            throw new Error(`Unexpected table ${table}`);
        }
      },
    });

    const result = await checkProductClaimsPermission(userId, ['missing']);

    expect(result.hasPermission).toBe(false);
    expect(result.errors[0]).toContain('Products could not be found');
  });
});
