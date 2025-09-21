/**
 * Route tests: matrix includes global overrides and prefers market-specific
 */
import { NextResponse } from 'next/server';
import { ALL_COUNTRIES_CODE, GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';

jest.mock('@/lib/auth/api-auth', () => ({
  withAuth: (handler: any) => handler,
}));

// Mock Supabase admin client with minimal chainable API
type Table = 'products' | 'claims' | 'product_ingredients' | 'market_claim_overrides';

function createMockSupabase(datasets: Record<string, any[]>) {
  return {
    from(table: Table) {
      const ctx: any = { table, filters: [] as any[] };
      const builder: any = {
        select: (_: string) => builder,
        in: (field: string, values: any[]) => {
          ctx.filters.push({ type: 'in', field, values });
          // For certain final calls, return result immediately
          if (table === 'product_ingredients' && field === 'product_id') {
            return { data: datasets.product_ingredients || [], error: null };
          }
          if (table === 'market_claim_overrides' && field === 'market_country_code') {
            // Filter overrides by product and market values
            const prodFilter = ctx.filters.find((f: any) => f.field === 'target_product_id');
            const targetValues = prodFilter
              ? (Array.isArray(prodFilter.values) ? prodFilter.values : [prodFilter.value])
              : undefined;
            const result = (datasets.market_claim_overrides || []).filter((o: any) =>
              (!targetValues || targetValues.includes(o.target_product_id)) &&
              values.includes(o.market_country_code)
            ).map((override: any) => {
              if (override.replacement_claim_id) {
                const replacement = (datasets.replacement_claims || []).find((c: any) => c.id === override.replacement_claim_id);
                return { ...override, replacement_claim: replacement || null };
              }
              return override;
            });
            return { data: result, error: null };
          }
          if (table === 'claims' && field === 'id') {
            const result = (datasets.replacement_claims || []).filter((c: any) => values.includes(c.id));
            return { data: result, error: null };
          }
          return builder;
        },
        eq: (field: string, value: any) => {
          ctx.filters.push({ type: 'eq', field, value });
          if (table === 'products') {
            return { data: datasets.products || [], error: null };
          }
          if (table === 'claims' && field === 'level') {
            const toArray = (entry: any) => {
              if (!entry) return [];
              if (Array.isArray(entry.values)) return entry.values;
              if (Array.isArray(entry.value)) return entry.value;
              return typeof entry.value !== 'undefined' ? [entry.value] : [];
            };
            const masterBrandIds = toArray(ctx.filters.find((f: any) => f.field === 'master_brand_id'));
            const productIds = toArray(ctx.filters.find((f: any) => f.field === 'product_id'));
            const ingredientIds = toArray(ctx.filters.find((f: any) => f.field === 'ingredient_id'));
            const countryCodes = toArray(ctx.filters.find((f: any) => f.field === 'country_code'));
            const allowedIds = toArray(ctx.filters.find((f: any) => f.field === 'id'));
            const claimsDataset = datasets.claims || [];
            const filtered = claimsDataset.filter((c: any) => {
              const levelOk = c.level === value;
              const idMatch = allowedIds.length ? allowedIds.includes(c.id) : true;
              const idOk = value === 'brand'
                ? (masterBrandIds.length ? masterBrandIds.includes(c.master_brand_id) : idMatch)
                : value === 'product'
                  ? (productIds.length ? productIds.includes(c.product_id) : idMatch)
                  : (ingredientIds.length ? ingredientIds.includes(c.ingredient_id) : idMatch);
              const countryOk = countryCodes.length === 0 || countryCodes.includes(c.country_code);
              return levelOk && idOk && countryOk;
            });
            return { data: filtered, error: null };
          }
          return builder;
        },
        order: (_: string, __?: any) => ({ data: datasets.products || [], error: null }),
        single: () => ({ data: null, error: null }),
      };
      return builder;
    },
  };
}

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

describe('GET /api/claims/matrix', () => {
  const products = [{ id: 'p1', name: 'Prod 1', description: null, master_brand_id: 'mb1' }];
  const masterClaim = { id: 'mc1', claim_text: 'Claim A', claim_type: 'allowed', level: 'brand', master_brand_id: 'mb1', country_code: GLOBAL_CLAIM_COUNTRY_CODE };

  beforeEach(() => {
    jest.resetModules();
  });

  it('falls back to global override when no market-specific override', async () => {
    const datasets = {
      products,
      claims: [masterClaim],
      product_ingredients: [],
      market_claim_overrides: [
        { id: 'ovG', master_claim_id: 'mc1', market_country_code: ALL_COUNTRIES_CODE, target_product_id: 'p1', is_blocked: true, replacement_claim_id: null },
      ],
      replacement_claims: [],
    };
    const { createSupabaseAdminClient } = await import('@/lib/supabase/client');
    (createSupabaseAdminClient as jest.Mock).mockReturnValue(createMockSupabase(datasets));

    const { GET } = await import('../route');
    const req = { url: 'http://localhost/api/claims/matrix?countryCode=GB' } as any;
    const res = (await GET(req as any)) as NextResponse;
    expect(res.status).toBe(200);
    const body = await (res as any).json();
    expect(body.success).toBe(true);
    const cell = body.data.cellData['Claim A']['p1'];
    expect(cell.effectiveStatus).toBe('none');
    expect(cell.activeOverride).toBeTruthy();
    expect(cell.isBlockedOverride).toBe(true);
  });

  it('prefers market-specific override over global override', async () => {
    const datasets = {
      products,
      claims: [masterClaim],
      product_ingredients: [],
      market_claim_overrides: [
        { id: 'ovG', master_claim_id: 'mc1', market_country_code: ALL_COUNTRIES_CODE, target_product_id: 'p1', is_blocked: true, replacement_claim_id: null },
        { id: 'ovFR', master_claim_id: 'mc1', market_country_code: 'FR', target_product_id: 'p1', is_blocked: true, replacement_claim_id: 'rep1' },
      ],
      replacement_claims: [
        { id: 'rep1', claim_text: 'Replacement FR', claim_type: 'allowed', level: 'brand', master_brand_id: 'mb1', country_code: 'FR' },
      ],
    };
    const { createSupabaseAdminClient } = await import('@/lib/supabase/client');
    (createSupabaseAdminClient as jest.Mock).mockReturnValue(createMockSupabase(datasets));

    const { GET } = await import('../route');
    const req = { url: 'http://localhost/api/claims/matrix?countryCode=FR' } as any;
    const res = (await GET(req as any)) as NextResponse;
    expect(res.status).toBe(200);
    const body = await (res as any).json();
    const cell = body.data.cellData['Claim A']['p1'];
    expect(cell.effectiveStatus).toBe('allowed');
    expect(cell.isReplacementOverride).toBe(true);
    expect(cell.activeOverride.replacementClaimText).toBe('Replacement FR');
  });
});
