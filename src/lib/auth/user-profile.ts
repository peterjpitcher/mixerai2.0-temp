import { SupabaseClient } from '@supabase/supabase-js';

// This function retrieves the current user's profile, including their role
// and a list of brand IDs they are assigned to.
export async function getProfileWithAssignedBrands(supabase: SupabaseClient) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user:', userError?.message);
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
    return { role: role, assigned_brands: [] };
  }
  
  const assigned_brands = permissions ? permissions.map(p => p.brand_id) : [];

  return {
    role: role,
    assigned_brands,
  };
} 