import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserBrandPermissions, hasAccessToBrand, hasBrandRole } from './permissions';

/**
 * Check if user is a global admin (platform admin)
 */
export function isGlobalAdmin(user: User | null): boolean {
  return user?.user_metadata?.role === 'admin';
}

/**
 * Check if user has any brand permissions
 */
export function hasBrandPermissions(user: User | null): boolean {
  return Array.isArray(user?.user_metadata?.brand_permissions) && 
         user.user_metadata.brand_permissions.length > 0;
}

/**
 * Get user's role for a specific brand from metadata
 */
export function getUserBrandRole(user: User | null, brandId: string): string | null {
  if (!user?.user_metadata?.brand_permissions) return null;
  
  const permission = user.user_metadata.brand_permissions.find(
    (p: any) => p.brand_id === brandId
  );
  
  return permission?.role || null;
}

/**
 * Check if user can edit in any brand
 */
export async function canEditInAnyBrand(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const permissions = await getUserBrandPermissions(userId, supabase);
  
  return permissions.some(p => p.role === 'admin' || p.role === 'editor');
}

/**
 * Check if user can manage any brand
 */
export async function canManageAnyBrand(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const permissions = await getUserBrandPermissions(userId, supabase);
  
  return permissions.some(p => p.role === 'admin');
}

/**
 * Get all brand IDs where user has specific role
 */
export async function getBrandsByRole(
  userId: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<string[]> {
  const supabase = createSupabaseServerClient();
  const permissions = await getUserBrandPermissions(userId, supabase);
  
  // Role hierarchy: admin > editor > viewer
  if (role === 'viewer') {
    // All permissions grant viewer access
    return permissions.map(p => p.brand_id);
  } else if (role === 'editor') {
    // Admin and editor roles grant editor access
    return permissions
      .filter(p => p.role === 'admin' || p.role === 'editor')
      .map(p => p.brand_id);
  } else {
    // Only admin role grants admin access
    return permissions
      .filter(p => p.role === 'admin')
      .map(p => p.brand_id);
  }
}

/**
 * Check if user has minimum required role for a brand
 * @param requiredRole - Minimum role required
 */
export async function checkBrandPermission(
  userId: string,
  brandId: string,
  requiredRole: 'admin' | 'editor' | 'viewer' = 'viewer'
): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  return hasBrandRole(userId, brandId, requiredRole, supabase);
}

/**
 * Filter an array of items by user's brand permissions
 */
export async function filterByBrandPermissions<T extends { brand_id: string }>(
  userId: string,
  items: T[]
): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const permissions = await getUserBrandPermissions(userId, supabase);
  const allowedBrandIds = permissions.map(p => p.brand_id);
  
  return items.filter(item => allowedBrandIds.includes(item.brand_id));
}

/**
 * Validate and normalize brand permissions from request
 */
export function normalizeBrandPermissions(
  permissions: any[]
): Array<{ brand_id: string; role: 'admin' | 'editor' | 'viewer' }> {
  if (!Array.isArray(permissions)) return [];
  
  return permissions
    .filter(p => p?.brand_id && p?.role)
    .map(p => ({
      brand_id: p.brand_id,
      role: p.role as 'admin' | 'editor' | 'viewer'
    }));
}