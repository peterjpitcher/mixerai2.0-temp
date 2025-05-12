import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth } from '@/lib/auth/route-handlers';
// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

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
      const supabaseInner = createSupabaseAdminClient();
      const { data: userPermissions, error: permissionError } = await supabaseInner
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
    const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(params.id);
    
    if (authError) throw authError;
    if (!authUserData || !authUserData.user) {
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
      id: authUserData.user.id,
      email: authUserData.user.email,
      full_name: profileData?.full_name || authUserData.user.user_metadata?.full_name || null,
      job_title: profileData?.job_title || authUserData.user.user_metadata?.job_title || null,
      company: profileData?.company || authUserData.user.user_metadata?.company || null,
      avatar_url: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUserData.user.id}`,
      role: highestRole,
      created_at: authUserData.user.created_at,
      last_sign_in_at: authUserData.user.last_sign_in_at,
      brand_permissions: profileData?.user_brand_permissions || [],
      is_current_user: authUserData.user.id === user.id
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
      const supabaseInner = createSupabaseAdminClient();
      const { data: userPermissions, error: permissionError } = await supabaseInner
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
    
    const profileUpdates: { [key: string]: any } = {};
    if (body.full_name !== undefined) profileUpdates.full_name = body.full_name;
    if (body.job_title !== undefined) profileUpdates.job_title = body.job_title;
    if (body.company !== undefined) profileUpdates.company = body.company;
    if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
    }

    const userMetadataUpdates: { [key: string]: any } = {};
    if (body.full_name !== undefined) userMetadataUpdates.full_name = body.full_name;
    if (body.job_title !== undefined) userMetadataUpdates.job_title = body.job_title;
    if (body.company !== undefined) userMetadataUpdates.company = body.company;

    if (Object.keys(userMetadataUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
            params.id,
            { user_metadata: userMetadataUpdates }
        );
        if (authUpdateError) throw authUpdateError;
    }

    if (Object.keys(profileUpdates).length > 0) {
        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', params.id);
        if (profileUpdateError) throw profileUpdateError;
    }
    
    // If role was provided and the current user is an admin, update the role
    if (body.role && user.id !== params.id) {
      // Get existing brand permissions
      const { data: existingPermissions, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('id, brand_id, role, user_id')
        .eq('user_id', params.id);
      
      if (permissionsError) throw permissionsError;
      
      // Update all brand permissions to the new role if no specific brand_permissions provided
      if (!body.brand_permissions && existingPermissions && existingPermissions.length > 0) {
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
    
    // Handle brand permissions if provided
    if (body.brand_permissions && Array.isArray(body.brand_permissions)) {
      // Get existing brand permissions for comparison
      const { data: existingPermissions, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('id, brand_id, role')
        .eq('user_id', params.id);
      
      if (permissionsError) throw permissionsError;
      
      // Create a map of existing permissions by brand_id for easier lookup
      const existingPermissionsMap = new Map();
      (existingPermissions || []).forEach(permission => {
        existingPermissionsMap.set(permission.brand_id, permission);
      });
      
      // Prepare permissions to update or insert
      const permissionsToUpsert = body.brand_permissions.map(permission => ({
        id: permission.id || existingPermissionsMap.get(permission.brand_id)?.id,
        user_id: params.id,
        brand_id: permission.brand_id,
        role: permission.role
      }));
      
      // Identify permissions to delete (brands that are in existing but not in the update)
      const brandIdsToKeep = new Set(body.brand_permissions.map(p => p.brand_id));
      const permissionIdsToDelete = (existingPermissions || [])
        .filter(p => !brandIdsToKeep.has(p.brand_id))
        .map(p => p.id);
      
      // Update or insert brand permissions
      if (permissionsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('user_brand_permissions')
          .upsert(permissionsToUpsert);
        
        if (upsertError) throw upsertError;
      }
      
      // Delete removed brand permissions
      if (permissionIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_brand_permissions')
          .delete()
          .in('id', permissionIdsToDelete);
        
        if (deleteError) throw deleteError;
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
    
    // Find all workflows where this user is an assignee
    const { data: workflowsToUpdate, error: workflowError } = await supabase
      .from('workflows')
      .select('id, brand_id, steps');
    
    if (workflowError) throw workflowError;
    
    // For each workflow, reassign the user's tasks to the brand admin
    if (workflowsToUpdate) {
      for (const workflow of workflowsToUpdate) {
        if (workflow.steps && Array.isArray(workflow.steps)) {
          let updated = false;
          
          // Find brand admin for this workflow's brand
          if (workflow.brand_id) {
            const { data: brandAdmins, error: brandAdminError } = await supabase
              .from('user_brand_permissions')
              .select('user_id')
              .eq('brand_id', workflow.brand_id)
              .eq('role', 'admin')
              .limit(1);
            
            if (brandAdminError) continue; // Skip this workflow if we can't find the brand admin
            
            // Skip if no brand admin found
            if (!brandAdmins || brandAdmins.length === 0) {
              continue;
            }
            
            const brandAdminId = brandAdmins[0].user_id;
            
            // Get brand admin's details
            if (brandAdminId) {
              const { data: adminProfile, error: adminProfileError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', brandAdminId)
                .single();
              
              if (adminProfileError || !adminProfile) continue;
              
              // Get admin's email from auth.users
              const { data: adminAuthUser, error: adminAuthError } = await supabase.auth.admin.getUserById(brandAdminId);
              
              if (adminAuthError || !adminAuthUser || !adminAuthUser.user) continue;
              
              const adminEmail = adminAuthUser.user.email;

              // Process workflows steps and reassign as needed
              const updatedSteps = workflow.steps.map((step: any) => {
                if (step.assignees && Array.isArray(step.assignees)) {
                  // Check if this step has the deleted user as an assignee
                  const hasDeletedUser = step.assignees.some((assignee: any) => 
                    assignee.id === params.id || 
                    (assignee.email && assignee.email === params.id)
                  );
                  
                  if (hasDeletedUser) {
                    updated = true;
                    
                    // Remove the deleted user
                    const filteredAssignees = step.assignees.filter((assignee: any) => 
                      assignee.id !== params.id && 
                      (!assignee.email || assignee.email !== params.id)
                    );
                    
                    // Check if the brand admin is already assigned
                    const adminAlreadyAssigned = filteredAssignees.some((assignee: any) => 
                      assignee.id === brandAdminId || 
                      (assignee.email && assignee.email === adminEmail)
                    );
                    
                    // Add the brand admin if not already assigned
                    if (!adminAlreadyAssigned) {
                      filteredAssignees.push({
                        id: brandAdminId,
                        email: adminEmail || '',
                        name: adminProfile?.full_name || 'Brand Admin',
                        reassigned_from_deleted_user: params.id
                      });
                    }
                    
                    step.assignees = filteredAssignees;
                  }
                }
                return step;
              });
              
              // Only update the workflow if changes were made
              if (updated) {
                const { error: updateWfError } = await supabase
                  .from('workflows')
                  .update({ steps: updatedSteps })
                  .eq('id', workflow.id);
                
                // Log updateWfError to a proper monitoring service in production if it occurs
              }
            }
          }
        }
      }
    }
    
    // Delete the user from Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(params.id);
    
    if (deleteAuthError) throw deleteAuthError;
    
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