import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth } from '@/lib/auth/route-handlers';

interface Params {
  params: { id: string }
}

// GET a single user by ID
export const GET = withRouteAuth(async (request: NextRequest, user: any, context: Params) => {
  const { params } = context;
  try {
    // Check if the user is trying to access their own profile or has admin permissions
    if (user.id !== params.id) {
      // Check if the user has admin permissions
      const supabase = createSupabaseAdminClient();
      const { data: userPermissions, error: permissionError } = await supabase
        .from('user_brand_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (permissionError) throw permissionError;
      
      if (!userPermissions) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to view this user' },
          { status: 403 }
        );
      }
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Get auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(params.id);
    
    if (authError) throw authError;
    if (!authUser || !authUser.user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_brand_permissions:user_brand_permissions(
          id,
          brand_id,
          role,
          brand:brands(id, name)
        )
      `)
      .eq('id', params.id)
      .maybeSingle();
    
    if (profileError) throw profileError;
    
    // Get the highest role (admin > editor > viewer)
    let highestRole = 'viewer';
    if (profile?.user_brand_permissions) {
      for (const permission of profile.user_brand_permissions) {
        if (permission.role === 'admin') {
          highestRole = 'admin';
          break;
        } else if (permission.role === 'editor' && highestRole !== 'admin') {
          highestRole = 'editor';
        }
      }
    }
    
    // Cast profile to any to avoid TypeScript errors with potentially missing fields
    const profileData = profile as any;
    
    const userData = {
      id: authUser.user.id,
      email: authUser.user.email,
      full_name: profileData?.full_name || authUser.user.user_metadata?.full_name || 'Unnamed User',
      job_title: profileData?.job_title || authUser.user.user_metadata?.job_title || '',
      avatar_url: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.user.id}`,
      role: highestRole,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      brand_permissions: profileData?.user_brand_permissions || [],
      is_current_user: authUser.user.id === user.id
    };
    
    return NextResponse.json({
      success: true,
      user: userData
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching user');
  }
});

// Update user
export const PUT = withRouteAuth(async (request: NextRequest, user: any, context: Params) => {
  const { params } = context;
  try {
    // Only allow admins or the user themselves to update
    if (user.id !== params.id) {
      // Check if the user has admin permissions
      const supabase = createSupabaseAdminClient();
      const { data: userPermissions, error: permissionError } = await supabase
        .from('user_brand_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (permissionError) throw permissionError;
      
      if (!userPermissions) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to update this user' },
          { status: 403 }
        );
      }
    }
    
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    const updates = {
      full_name: body.full_name,
      job_title: body.job_title,
      updated_at: new Date().toISOString()
    };
    
    // Update user metadata in auth.users
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      params.id,
      { 
        user_metadata: { 
          full_name: body.full_name,
          job_title: body.job_title 
        }
      }
    );
    
    if (authUpdateError) throw authUpdateError;
    
    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', params.id);
    
    if (profileUpdateError) throw profileUpdateError;
    
    // If role was provided and the current user is an admin, update the role
    if (body.role && user.id !== params.id) {
      // Get existing brand permissions
      const { data: existingPermissions, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('id, brand_id, role, user_id')
        .eq('user_id', params.id);
      
      if (permissionsError) throw permissionsError;
      
      // Update all brand permissions to the new role
      if (existingPermissions && existingPermissions.length > 0) {
        const permissionUpdates = existingPermissions.map(permission => ({
          id: permission.id,
          user_id: permission.user_id,
          brand_id: permission.brand_id,
          role: body.role.toLowerCase()
        }));
        
        const { error: permUpdateError } = await supabase
          .from('user_brand_permissions')
          .upsert(permissionUpdates);
        
        if (permUpdateError) throw permUpdateError;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    return handleApiError(error, 'Error updating user');
  }
});

// Delete user
export const DELETE = withRouteAuth(async (request: NextRequest, user: any, context: Params) => {
  const { params } = context;
  try {
    // Only allow admins to delete users
    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 403 }
      );
    }
    
    // Check if the user has admin permissions
    const supabase = createSupabaseAdminClient();
    const { data: userPermissions, error: permissionError } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (permissionError) throw permissionError;
    
    if (!userPermissions) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete users' },
        { status: 403 }
      );
    }
    
    // Delete the user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(params.id);
    
    if (deleteError) throw deleteError;
    
    // The cascade delete should handle the profiles and permissions tables,
    // but we'll manually clean them up just to be sure
    await supabase.from('user_brand_permissions').delete().eq('user_id', params.id);
    await supabase.from('profiles').delete().eq('id', params.id);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting user');
  }
}); 