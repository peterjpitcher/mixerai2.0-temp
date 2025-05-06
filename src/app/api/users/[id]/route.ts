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
      company: profileData?.company || authUser.user.user_metadata?.company || '',
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
      company: body.company,
      updated_at: new Date().toISOString()
    };
    
    // Update user metadata in auth.users
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      params.id,
      { 
        user_metadata: { 
          full_name: body.full_name,
          job_title: body.job_title,
          company: body.company
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
    
    // Find all workflows where this user is an assignee
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('id, brand_id, steps');
    
    if (workflowError) throw workflowError;
    
    // For each workflow, reassign the user's tasks to the brand admin
    for (const workflow of workflows || []) {
      if (workflow.steps && Array.isArray(workflow.steps)) {
        let updated = false;
        
        // Find brand admin for this workflow's brand
        const { data: brandAdmins, error: brandAdminError } = await supabase
          .from('user_brand_permissions')
          .select('user_id')
          .eq('brand_id', workflow.brand_id)
          .eq('role', 'admin')
          .limit(1);
        
        if (brandAdminError) {
          console.error(`Error finding brand admin for brand ${workflow.brand_id}:`, brandAdminError);
          continue; // Skip this workflow if we can't find the brand admin
        }
        
        // Skip if no brand admin found
        if (!brandAdmins || brandAdmins.length === 0) {
          console.warn(`No brand admin found for brand ${workflow.brand_id}, skipping workflow ${workflow.id}`);
          continue;
        }
        
        const brandAdminId = brandAdmins[0].user_id;
        
        // Get brand admin's details
        const { data: adminUser, error: adminUserError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', brandAdminId)
          .single();
        
        if (adminUserError || !adminUser) {
          console.error(`Error fetching brand admin details for user ${brandAdminId}:`, adminUserError);
          continue;
        }
        
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
                (assignee.email && assignee.email === adminUser?.email)
              );
              
              // Add the brand admin if not already assigned
              if (!adminAlreadyAssigned) {
                filteredAssignees.push({
                  id: brandAdminId,
                  email: adminUser?.email || '',
                  name: adminUser?.full_name || 'Brand Admin',
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
          const { error: updateError } = await supabase
            .from('workflows')
            .update({ steps: updatedSteps })
            .eq('id', workflow.id);
          
          if (updateError) {
            console.error(`Error updating workflow ${workflow.id}:`, updateError);
          } else {
            console.log(`Updated workflow ${workflow.id}: reassigned deleted user's tasks to brand admin ${brandAdminId}`);
          }
        }
      }
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