import { createServerClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export interface UserBrandPermission {
  brand_id: string;
  role: 'admin' | 'editor' | 'viewer';
  brand_name?: string;
}

/**
 * Get all brand permissions for a user
 */
export async function getUserBrandPermissions(
  userId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<UserBrandPermission[]> {
  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select(`
        brand_id,
        role,
        brands!inner(name)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user brand permissions:', error);
      return [];
    }

    return (data || [])
      .filter(item => item.brand_id !== null)
      .map(item => ({
        brand_id: item.brand_id!,
        role: item.role as 'admin' | 'editor' | 'viewer',
        brand_name: (item as any).brands?.name
      }));
  } catch (e) {
    console.error('Exception in getUserBrandPermissions:', e);
    return [];
  }
}

/**
 * Check if user has any permission for a specific brand
 */
export async function hasAccessToBrand(
  userId: string,
  brandId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .single();

    return !error && !!data;
  } catch (e) {
    console.error('Exception in hasAccessToBrand:', e);
    return false;
  }
}

/**
 * Check if user has specific role for a brand
 */
export async function hasBrandRole(
  userId: string,
  brandId: string,
  role: 'admin' | 'editor' | 'viewer',
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .single();

    if (error || !data) return false;

    // Role hierarchy: admin > editor > viewer
    if (role === 'viewer') {
      return true; // Any role has viewer permissions
    }
    if (role === 'editor') {
      return data.role === 'admin' || data.role === 'editor';
    }
    return data.role === 'admin';
  } catch (e) {
    console.error('Exception in hasBrandRole:', e);
    return false;
  }
}

/**
 * Check if user is a platform admin (has admin role and no brand assignments)
 */
export async function isPlatformAdmin(
  user: User,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  // Check if user has admin role in metadata
  if (user.user_metadata?.role !== 'admin') {
    return false;
  }

  // Check if user has any brand assignments
  try {
    const { count, error } = await supabase
      .from('user_brand_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error checking platform admin status:', error);
      return false;
    }

    // Platform admin has admin role and no brand assignments
    return count === 0;
  } catch (e) {
    console.error('Exception in isPlatformAdmin:', e);
    return false;
  }
}

/**
 * Filter resources based on user's brand permissions
 * Returns an array of brand IDs the user has access to
 */
export async function getUserAccessibleBrands(
  userId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<string[]> {
  const permissions = await getUserBrandPermissions(userId, supabase);
  return permissions.map(p => p.brand_id);
}

/**
 * Check if user can access a product based on its brand
 */
export async function canAccessProduct(
  userId: string,
  productId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  try {
    // First check if user is platform admin
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const isAdmin = await isPlatformAdmin(userData.user, supabase);
      if (isAdmin) return true;
    }

    // First get the product's master brand
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('master_brand_id')
      .eq('id', productId)
      .single();

    if (productError || !product || !product.master_brand_id) {
      return false;
    }

    // Get the mixerai_brand_id from master_claim_brands
    const { data: masterBrand, error: masterBrandError } = await supabase
      .from('master_claim_brands')
      .select('mixerai_brand_id')
      .eq('id', product.master_brand_id)
      .single();

    if (masterBrandError || !masterBrand || !masterBrand.mixerai_brand_id) {
      // Master brand not linked to a MixerAI brand
      // For unlinked master brands, only platform admins can access
      console.log(`Master brand ${product.master_brand_id} not linked to MixerAI brand - access denied for non-admin user ${userId}`);
      return false;
    }

    // Check if user has access to the MixerAI brand
    return hasAccessToBrand(userId, masterBrand.mixerai_brand_id, supabase);
  } catch (e) {
    console.error('Exception in canAccessProduct:', e);
    return false;
  }
}

/**
 * Check if user can access an ingredient based on its brand
 */
export async function canAccessIngredient(
  _userId: string,
  _ingredientId: string,
  _supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  // TODO: Implement proper ingredient access control once ingredients are linked to brands
  // For now, allow access to all ingredients
  return true;
}

/**
 * Check if user can edit content in a brand (requires editor or admin role)
 */
export async function canEditInBrand(
  userId: string,
  brandId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  return hasBrandRole(userId, brandId, 'editor', supabase);
}

/**
 * Check if user can manage brand settings (requires admin role)
 */
export async function canManageBrand(
  userId: string,
  brandId: string,
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  return hasBrandRole(userId, brandId, 'admin', supabase);
}
