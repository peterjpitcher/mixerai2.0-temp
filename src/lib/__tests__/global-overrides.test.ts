import { getStackedClaimsForProduct } from '../claims-utils';
import { createSupabaseAdminClient } from '../supabase/client';
import { ALL_COUNTRIES_CODE } from '../constants/country-codes';

// Mock the Supabase client
jest.mock('../supabase/client', () => ({
  createSupabaseAdminClient: jest.fn()
}));

describe('Global Overrides Feature', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    };

    (createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStackedClaimsForProduct', () => {
    it('should fetch both country-specific and global overrides', async () => {
      const productId = 'test-product-id';
      const countryCode = 'US';

      // Mock product data
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: productId, name: 'Test Product', master_brand_id: 'brand-id' },
        error: null
      });

      // Mock claims data
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock product ingredients
      mockSupabase.select.mockImplementation((fields: string) => {
        if (fields === 'ingredient_id') {
          return {
            ...mockSupabase,
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        return mockSupabase;
      });

      // Mock market overrides - this is the key test
      mockSupabase.in.mockImplementation((field: string, values: string[]) => {
        if (field === 'market_country_code' && 
            values.includes(countryCode) && 
            values.includes(ALL_COUNTRIES_CODE)) {
          return {
            ...mockSupabase,
            data: [
              {
                id: 'override-1',
                master_claim_id: 'claim-1',
                market_country_code: countryCode,
                target_product_id: productId,
                is_blocked: true,
                replacement_claim_id: null
              },
              {
                id: 'override-2',
                master_claim_id: 'claim-2',
                market_country_code: ALL_COUNTRIES_CODE,
                target_product_id: productId,
                is_blocked: true,
                replacement_claim_id: null
              }
            ],
            error: null
          };
        }
        return mockSupabase;
      });

      await getStackedClaimsForProduct(productId, countryCode);

      // Verify that both country-specific and global overrides are fetched
      expect(mockSupabase.in).toHaveBeenCalledWith(
        'market_country_code',
        [countryCode, ALL_COUNTRIES_CODE]
      );
    });

    it('should apply country-specific override over global override', async () => {
      const productId = 'test-product-id';
      const countryCode = 'FR';
      const masterClaimId = 'master-claim-1';

      // Mock product data
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: productId, name: 'Test Product', master_brand_id: 'brand-id' },
        error: null
      });

      // Mock claims data - one global claim
      mockSupabase.order.mockResolvedValue({
        data: [{
          id: masterClaimId,
          claim_text: 'High quality product',
          claim_type: 'allowed',
          level: 'product',
          product_id: productId,
          country_code: '__GLOBAL__'
        }],
        error: null
      });

      // Mock product ingredients
      mockSupabase.eq.mockImplementation((field: string, value: string) => {
        if (field === 'product_id' && value === productId) {
          return {
            ...mockSupabase,
            data: [],
            error: null
          };
        }
        return mockSupabase;
      });

      // Mock market overrides - both global and country-specific
      const mockOverrides = [
        {
          id: 'global-override',
          master_claim_id: masterClaimId,
          market_country_code: ALL_COUNTRIES_CODE,
          target_product_id: productId,
          is_blocked: true,
          replacement_claim_id: null
        },
        {
          id: 'country-override',
          master_claim_id: masterClaimId,
          market_country_code: countryCode,
          target_product_id: productId,
          is_blocked: false,
          replacement_claim_id: 'replacement-claim-id',
          replacement_claim: {
            id: 'replacement-claim-id',
            claim_text: 'French specific claim',
            claim_type: 'allowed',
            country_code: countryCode
          }
        }
      ];

      mockSupabase.in.mockImplementation((field: string, values: string[]) => {
        if (field === 'market_country_code') {
          return {
            ...mockSupabase,
            data: mockOverrides,
            error: null
          };
        }
        return mockSupabase;
      });

      const result = await getStackedClaimsForProduct(productId, countryCode);

      // Verify that country-specific override takes precedence
      expect(result).toHaveLength(1);
      expect(result[0].claim_text).toBe('French specific claim');
      expect(result[0].is_replacement_override).toBe(true);
    });

    it('should apply global override when no country-specific override exists', async () => {
      const productId = 'test-product-id';
      const countryCode = 'DE';
      const masterClaimId = 'master-claim-1';

      // Mock product data
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: productId, name: 'Test Product', master_brand_id: 'brand-id' },
        error: null
      });

      // Mock claims data - one global claim
      mockSupabase.order.mockResolvedValue({
        data: [{
          id: masterClaimId,
          claim_text: 'Contains allergens',
          claim_type: 'disallowed',
          level: 'product',
          product_id: productId,
          country_code: '__GLOBAL__'
        }],
        error: null
      });

      // Mock product ingredients
      mockSupabase.eq.mockImplementation((field: string, value: string) => {
        if (field === 'product_id' && value === productId) {
          return {
            ...mockSupabase,
            data: [],
            error: null
          };
        }
        return mockSupabase;
      });

      // Mock market overrides - only global override
      const mockOverrides = [
        {
          id: 'global-override',
          master_claim_id: masterClaimId,
          market_country_code: ALL_COUNTRIES_CODE,
          target_product_id: productId,
          is_blocked: true,
          replacement_claim_id: null
        }
      ];

      mockSupabase.in.mockImplementation((field: string, values: string[]) => {
        if (field === 'market_country_code') {
          return {
            ...mockSupabase,
            data: mockOverrides,
            error: null
          };
        }
        return mockSupabase;
      });

      const result = await getStackedClaimsForProduct(productId, countryCode);

      // Verify that global override is applied
      expect(result).toHaveLength(1);
      expect(result[0].final_claim_type).toBe('none');
      expect(result[0].is_blocked_override).toBe(true);
      expect(result[0].description).toContain('blocked globally');
    });
  });

  describe('Precedence Rules', () => {
    it('should handle multiple countries with different override combinations', async () => {
      const productId = 'test-product-id';
      const masterClaimId = 'master-claim-1';

      // Mock product data
      mockSupabase.single.mockResolvedValue({
        data: { id: productId, name: 'Test Product', master_brand_id: 'brand-id' },
        error: null
      });

      // Mock base claim
      const baseClaim = {
        id: masterClaimId,
        claim_text: 'Premium quality',
        claim_type: 'allowed',
        level: 'product',
        product_id: productId,
        country_code: '__GLOBAL__'
      };

      // Test for multiple countries
      const testCases = [
        { country: 'US', hasCountryOverride: true, expectBlocked: false },
        { country: 'GB', hasCountryOverride: false, expectBlocked: true }, // Global applies
        { country: 'FR', hasCountryOverride: true, expectBlocked: true },
        { country: 'JP', hasCountryOverride: false, expectBlocked: true }  // Global applies
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test
        jest.clearAllMocks();

        // Mock claims data
        mockSupabase.order.mockResolvedValue({
          data: [baseClaim],
          error: null
        });

        // Mock product ingredients
        mockSupabase.eq.mockImplementation((field: string, value: string) => {
          if (field === 'product_id' && value === productId) {
            return {
              ...mockSupabase,
              data: [],
              error: null
            };
          }
          return mockSupabase;
        });

        // Build overrides based on test case
        const overrides = [
          {
            id: 'global-override',
            master_claim_id: masterClaimId,
            market_country_code: ALL_COUNTRIES_CODE,
            target_product_id: productId,
            is_blocked: true,
            replacement_claim_id: null
          }
        ];

        if (testCase.hasCountryOverride) {
          overrides.push({
            id: `${testCase.country}-override`,
            master_claim_id: masterClaimId,
            market_country_code: testCase.country,
            target_product_id: productId,
            is_blocked: testCase.expectBlocked,
            replacement_claim_id: testCase.expectBlocked ? null : 'replacement-id',
            replacement_claim: testCase.expectBlocked ? undefined : {
              id: 'replacement-id',
              claim_text: `${testCase.country} specific claim`,
              claim_type: 'allowed',
              country_code: testCase.country
            }
          });
        }

        mockSupabase.in.mockImplementation((field: string, values: string[]) => {
          if (field === 'market_country_code') {
            return {
              ...mockSupabase,
              data: overrides.filter(o => 
                values.includes(o.market_country_code)
              ),
              error: null
            };
          }
          return mockSupabase;
        });

        const result = await getStackedClaimsForProduct(productId, testCase.country);

        // Verify expected behavior
        expect(result).toHaveLength(1);
        if (testCase.expectBlocked) {
          expect(result[0].final_claim_type).toBe('none');
          expect(result[0].is_blocked_override).toBe(true);
        } else {
          expect(result[0].claim_text).toContain(testCase.country);
          expect(result[0].is_replacement_override).toBe(true);
        }
      }
    });
  });
});