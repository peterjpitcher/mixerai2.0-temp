import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { logError } from '@/lib/logger';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';

/**
 * Check if user has permission to create claims for products (optimized batch query)
 * 
 * @param userId - The ID of the user to check permissions for
 * @param productIds - Array of product IDs to verify permissions against
 * @returns Promise resolving to an object with:
 *   - hasPermission: boolean indicating if user has admin rights for ALL products
 *   - errors: Array of error messages if permission check fails
 * 
 * @description
 * This function performs a single optimized query to check if a user has admin permissions
 * for all specified products. It checks both master brand permissions and individual
 * mixer brand permissions through the products' associated brands.
 * 
 * Permission logic:
 * - If user is a global admin (role='admin'), they have permission for all products
 * - Otherwise, user must have admin role for the brand of EVERY specified product
 * - Products can be associated with brands through master_claim_brand_id or mixer_brand_id
 * 
 * @example
 * const { hasPermission, errors } = await checkProductClaimsPermission(
 *   "user-123",
 *   ["product-456", "product-789"]
 * );
 * if (!hasPermission) {
 *   console.error("Permission denied:", errors);
 * }
 */
export async function checkProductClaimsPermission(
  userId: string,
  productIds: string[]
): Promise<{ hasPermission: boolean; errors: string[] }> {
  const supabase = createSupabaseAdminClient();
  const errors: string[] = [];

  if (!productIds.length) {
    return { hasPermission: false, errors: ['No products provided'] };
  }

  try {
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, master_brand_id')
      .in('id', productIds);

    if (productsError) {
      logError('[checkProductClaimsPermission] Error fetching products:', productsError);
      errors.push('Failed to fetch product information');
      return { hasPermission: false, errors };
    }

    if (!productsData || productsData.length === 0) {
      errors.push('Products could not be found');
      return { hasPermission: false, errors };
    }

    const missingProductIds = productIds.filter(
      (id) => !productsData.some((product) => product.id === id)
    );
    if (missingProductIds.length > 0) {
      errors.push(`Products not found: ${missingProductIds.join(', ')}`);
      return { hasPermission: false, errors };
    }

    const productsMissingBrand = productsData.filter((product) => !product.master_brand_id);
    if (productsMissingBrand.length > 0) {
      errors.push(
        `Products missing master brand linkage: ${productsMissingBrand
          .map((product) => product.id)
          .join(', ')}`
      );
      return { hasPermission: false, errors };
    }

    const masterBrandIds = Array.from(
      new Set(
        productsData
          .map((product) => product.master_brand_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    if (!masterBrandIds.length) {
      errors.push('No linked master brands found for the products');
      return { hasPermission: false, errors };
    }

    const { data: brandMappings, error: brandMappingError } = await supabase
      .from('master_claim_brands')
      .select('id, mixerai_brand_id')
      .in('id', masterBrandIds);

    if (brandMappingError) {
      logError('[checkProductClaimsPermission] Error fetching master claim brands:', brandMappingError);
      errors.push('Failed to resolve brand permissions');
      return { hasPermission: false, errors };
    }

    const mixeraiBrandIdByMasterId = new Map<string, string>();
    (brandMappings || []).forEach((row) => {
      if (row?.id && row?.mixerai_brand_id) {
        mixeraiBrandIdByMasterId.set(row.id, row.mixerai_brand_id);
      }
    });

    const unresolvedBrands = masterBrandIds.filter(
      (brandId) => !mixeraiBrandIdByMasterId.has(brandId)
    );

    if (unresolvedBrands.length > 0) {
      errors.push(
        `Brands missing MixerAI brand mapping: ${unresolvedBrands.join(', ')}`
      );
      return { hasPermission: false, errors };
    }

    const mixeraiBrandIds = Array.from(new Set(mixeraiBrandIdByMasterId.values()));

    if (!mixeraiBrandIds.length) {
      errors.push('No MixerAI brands available for permission check');
      return { hasPermission: false, errors };
    }

    const { data: permissionsData, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select('brand_id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .in('brand_id', mixeraiBrandIds);

    if (permissionsError) {
      logError('[checkProductClaimsPermission] Error fetching permissions:', permissionsError);
      errors.push('Failed to check user permissions');
      return { hasPermission: false, errors };
    }

    const authorizedBrandIds = new Set(permissionsData?.map((permission) => permission.brand_id) || []);
    const unauthorizedBrands = mixeraiBrandIds.filter((brandId) => !authorizedBrandIds.has(brandId));

    if (unauthorizedBrands.length) {
      errors.push('You do not have permission for all brands associated with these products');
      return { hasPermission: false, errors };
    }

    return { hasPermission: true, errors: [] };
  } catch (error) {
    logError('[checkProductClaimsPermission] Unexpected error:', error);
    errors.push('An unexpected error occurred');
    return { hasPermission: false, errors };
  }
}

/**
 * Batch fetch claims with related data to avoid N+1 queries
 * 
 * @param filters - Filtering options for claims
 * @param filters.countryCode - Filter claims by country code (optional)
 * @param filters.excludeGlobal - Whether to exclude global claims (ALL countries) (optional)
 * @param filters.level - Filter by claim level: 'brand', 'product', or 'ingredient' (optional)
 * @param pagination - Pagination parameters
 * @param pagination.page - Page number (1-indexed)
 * @param pagination.limit - Number of items per page
 * @param includes - Flags for including related data
 * @param includes.masterBrandName - Include master brand names (optional)
 * @param includes.productNames - Include product names (optional)
 * @param includes.ingredientName - Include ingredient names (optional)
 * @returns Promise resolving to an object containing:
 *   - claims: Array of claims with requested related data
 *   - totalCount: Total number of claims matching filters
 *   - totalPages: Total number of pages
 *   - currentPage: Current page number
 * 
 * @description
 * Performs optimized database queries with selective joins based on requested includes.
 * This prevents N+1 query problems by fetching all related data in a single query.
 * Supports pagination and flexible filtering options.
 * 
 * @example
 * const result = await fetchClaimsWithRelations(
 *   { countryCode: 'US', level: 'product' },
 *   { page: 1, limit: 20 },
 *   { masterBrandName: true, productNames: true }
 * );
 */
export async function fetchClaimsWithRelations(
  filters: {
    countryCode?: string;
    excludeGlobal?: boolean;
    level?: 'brand' | 'product' | 'ingredient';
  },
  pagination: {
    page: number;
    limit: number;
  },
  includes: {
    masterBrandName?: boolean;
    productNames?: boolean;
    ingredientName?: boolean;
  }
) {
  const supabase = createSupabaseAdminClient();
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;
  
  // Build select statement with relations
  const selectParts = ['*'];
  if (includes.masterBrandName) {
    selectParts.push('master_claim_brands(name)');
  }
  if (includes.productNames) {
    selectParts.push('products!claims_product_id_fkey(name)');
  }
  if (includes.ingredientName) {
    selectParts.push('ingredients(name)');
  }
  
  const selectStatement = selectParts.join(', ');
  
  let query = supabase
    .from('claims')
    .select(selectStatement, { count: 'exact' });
  
  // Apply filters
  if (filters.countryCode) {
    query = query.eq('country_code', filters.countryCode);
  }
  if (filters.excludeGlobal) {
    query = query.not('country_code', 'eq', GLOBAL_CLAIM_COUNTRY_CODE);
  }
  if (filters.level) {
    query = query.eq('level', filters.level);
  }
  
  // Apply pagination and ordering
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw error;
  }
  
  return {
    data,
    count: count || 0,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
      hasNextPage: page < (count ? Math.ceil(count / limit) : 0),
      hasPreviousPage: page > 1
    }
  };
}
