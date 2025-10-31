import type { SupabaseClient, User } from '@supabase/supabase-js';

interface GetProfileOptions {
  user?: User | null;
}

interface ProfileWithAssignedBrands {
  role: string;
  assigned_brands: string[];
}

// This function retrieves the current user's profile, including their role
// and a list of brand IDs they are assigned to.
export async function getProfileWithAssignedBrands(
  supabase: SupabaseClient,
  options?: GetProfileOptions
): Promise<ProfileWithAssignedBrands | null> {
  const providedUser = options?.user ?? null;
  let user = providedUser;

  if (!user) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      console.error('Error fetching user:', error?.message);
      return null;
    }
    user = data.user;
  }

  if (!user) {
    return null;
  }

  // The user's role is correctly sourced from the user_metadata object.
  const role = user.user_metadata?.role || 'viewer';

  // Step 2: Fetch brand permissions from the correct 'user_brand_permissions' table.
  // This ensures consistency with other parts of the application.
  const { data: permissions, error: permissionsError } = await supabase
    .from('user_brand_permissions')
    .select('brand_id')
    .eq('user_id', user.id);

  if (permissionsError) {
    console.error('Error fetching brand permissions:', permissionsError.message);
    // Return the role but with empty brands, as permissions might not be set.
    return { role, assigned_brands: [] };
  }

  const assigned_brands = permissions
    ? permissions
        .map(permission => permission.brand_id)
        .filter((brandId): brandId is string => Boolean(brandId))
    : [];

  return {
    role,
    assigned_brands,
  };
}
