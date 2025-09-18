import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAdminAuth } from '@/lib/auth/api-auth';

const testsEnabled = process.env.ENABLE_TEST_ENDPOINTS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'This test endpoint is disabled. Set ENABLE_TEST_ENDPOINTS=true to enable locally.' },
    { status: 410 }
  );
}

export const dynamic = "force-dynamic";

/**
 * GET endpoint to directly examine user permissions in the database
 * Only for debugging purposes
 */
export const GET = withAdminAuth(async (request: NextRequest, user) => {
  if (!testsEnabled) {
    return disabledResponse();
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  }
  try {
    const supabase = createSupabaseAdminClient();
    
    // Check if the current user has admin permissions
    const { data: isAdmin, error: adminCheckError } = await supabase
      .from('user_brand_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (adminCheckError) throw adminCheckError;
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only admin users can access this endpoint' },
        { status: 403 }
      );
    }

    // Get all users from auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    // Get all user profiles with associated role information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        user_brand_permissions(*)
      `);
    
    if (profilesError) throw profilesError;
    
    // Get all brand permissions
    const { data: allPermissions, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select('*');
    
    if (permissionsError) throw permissionsError;
    
    // Get all direct database records to examine structure
    const usersWithPermissions = authUsers.users.map(authUser => {
      const profile = profiles.find((p: Record<string, unknown>) => p.id === authUser.id);
      const userPermissions = allPermissions.filter((p: Record<string, unknown>) => p.user_id === authUser.id);
      
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
        metadata_role: authUser.user_metadata?.role || null,
        permissions: userPermissions,
        permission_count: userPermissions.length,
        has_admin_role: userPermissions.some((p: Record<string, unknown>) => p.role === 'admin')
      };
    });

    return NextResponse.json({ 
      success: true,
      users: usersWithPermissions,
      all_permissions: allPermissions,
      debug_info: {
        current_user_id: user.id,
        is_current_user_admin: isAdmin ? true : false,
        total_users: authUsers.users.length,
        total_permissions: allPermissions.length
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error checking user permissions');
  }
}); 
