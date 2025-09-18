import { SupabaseClient, User } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';

export class BrandPermissionVerificationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BrandPermissionVerificationError';
  }
}

export function isPlatformAdminUser(user: User | null | undefined): boolean {
  return user?.user_metadata?.role === 'admin';
}

export async function userHasBrandAccess(
  supabase: SupabaseClient<Database>,
  user: User,
  brandId: string
): Promise<boolean> {
  if (!brandId) {
    return false;
  }

  if (isPlatformAdminUser(user)) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select('brand_id')
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .maybeSingle();

    if (error) {
      console.error(
        `[brand-access] Failed to verify brand permissions for user ${user.id} and brand ${brandId}:`,
        error
      );
      throw new BrandPermissionVerificationError('Failed to verify brand permissions', error);
    }

    return Boolean(data);
  } catch (error) {
    if (error instanceof BrandPermissionVerificationError) {
      throw error;
    }

    console.error(
      `[brand-access] Unexpected error verifying brand permissions for user ${user.id} and brand ${brandId}:`,
      error
    );
    throw new BrandPermissionVerificationError('Failed to verify brand permissions', error);
  }
}

export async function requireBrandAccess(
  supabase: SupabaseClient<Database>,
  user: User,
  brandId: string
): Promise<void> {
  try {
    const hasAccess = await userHasBrandAccess(supabase, user, brandId);
    if (!hasAccess) {
      throw new Error('NO_BRAND_ACCESS');
    }
  } catch (error) {
    if (error instanceof BrandPermissionVerificationError) {
      throw error;
    }

    if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
      throw error;
    }

    throw new BrandPermissionVerificationError('Failed to verify brand permissions', error);
  }
}

export async function userIsBrandAdmin(
  supabase: SupabaseClient<Database>,
  user: User,
  brandId: string
): Promise<boolean> {
  if (!brandId) {
    return false;
  }

  if (isPlatformAdminUser(user)) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .maybeSingle();

    if (error) {
      console.error(
        `[brand-access] Failed to verify brand admin permissions for user ${user.id} and brand ${brandId}:`,
        error
      );
      throw new BrandPermissionVerificationError('Failed to verify brand admin permissions', error);
    }

    return data?.role === 'admin';
  } catch (error) {
    if (error instanceof BrandPermissionVerificationError) {
      throw error;
    }

    console.error(
      `[brand-access] Unexpected error verifying brand admin permissions for user ${user.id} and brand ${brandId}:`,
      error
    );
    throw new BrandPermissionVerificationError('Failed to verify brand admin permissions', error);
  }
}

export async function requireBrandAdminAccess(
  supabase: SupabaseClient<Database>,
  user: User,
  brandId: string
): Promise<void> {
  try {
    const isAdmin = await userIsBrandAdmin(supabase, user, brandId);
    if (!isAdmin) {
      throw new Error('NO_BRAND_ADMIN_ACCESS');
    }
  } catch (error) {
    if (error instanceof BrandPermissionVerificationError) {
      throw error;
    }

    if (error instanceof Error && error.message === 'NO_BRAND_ADMIN_ACCESS') {
      throw error;
    }

    throw new BrandPermissionVerificationError('Failed to verify brand admin permissions', error);
  }
}
