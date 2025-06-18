import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * Check if user has permission to create claims for products (optimized batch query)
 */
export async function checkProductClaimsPermission(
  userId: string,
  productIds: string[]
): Promise<{ hasPermission: boolean; errors: string[] }> {
  const supabase = createSupabaseAdminClient();
  const errors: string[] = [];
  
  try {
    // Batch fetch all products with their master brands and mixer brands in one query
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        master_brand_id,
        master_claim_brands!inner (
          id,
          mixerai_brand_id,
          brands!inner (
            id
          )
        )
      `)
      .in('id', productIds);
    
    if (productsError) {
      console.error('[checkProductClaimsPermission] Error fetching products:', productsError);
      errors.push('Failed to fetch product information');
      return { hasPermission: false, errors };
    }
    
    if (!productsData || productsData.length !== productIds.length) {
      errors.push('Some products were not found');
      return { hasPermission: false, errors };
    }
    
    // Extract all unique mixerai brand IDs
    const mixeraiBrandIds = [...new Set(
      productsData
        .map(p => p.master_claim_brands?.mixerai_brand_id)
        .filter(Boolean)
    )] as string[];
    
    if (mixeraiBrandIds.length === 0) {
      errors.push('No linked MixerAI brands found for the products');
      return { hasPermission: false, errors };
    }
    
    // Batch check permissions for all brands
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select('brand_id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .in('brand_id', mixeraiBrandIds);
    
    if (permissionsError) {
      console.error('[checkProductClaimsPermission] Error fetching permissions:', permissionsError);
      errors.push('Failed to check user permissions');
      return { hasPermission: false, errors };
    }
    
    // Check if user has permission for ALL brands
    const authorizedBrandIds = new Set(permissionsData?.map(p => p.brand_id) || []);
    const allAuthorized = mixeraiBrandIds.every(id => authorizedBrandIds.has(id));
    
    if (!allAuthorized) {
      errors.push('You do not have permission for all brands associated with these products');
      return { hasPermission: false, errors };
    }
    
    return { hasPermission: true, errors: [] };
  } catch (error) {
    console.error('[checkProductClaimsPermission] Unexpected error:', error);
    errors.push('An unexpected error occurred');
    return { hasPermission: false, errors };
  }
}

/**
 * Batch fetch claims with related data to avoid N+1 queries
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
  let selectParts = ['*'];
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
    query = query.not('country_code', 'eq', '__GLOBAL__');
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