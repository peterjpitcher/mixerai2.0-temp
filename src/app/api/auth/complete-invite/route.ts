import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST: Completes the invite process server-side after user confirms and sets password.
 * This endpoint assigns permissions based on metadata stored during the invite.
 * Requires authentication (user should be logged in after confirming).
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // User object comes from withAuth HOF
    const userId = user.id;
    const userEmail = user.email;
    const appMetadata = user.app_metadata; // Check metadata set during invite
    const userMetadata = user.user_metadata; // Check metadata set during invite/update

    console.log(`Completing invite for user: ${userId}, email: ${userEmail}`);
    console.log('App Metadata:', appMetadata);
    console.log('User Metadata:', userMetadata);

    // --- Permission Assignment Logic ---
    // This depends heavily on how roles/permissions were stored during the invite process.
    // Example: Assuming role and potentially brand_id/workflow_id were stored in app_metadata or user_metadata.
    
    // Example 1: Role stored directly in user_metadata during invite
    const assignedRole = userMetadata?.role || appMetadata?.role; 
    // Example 2: Invite might relate to a specific brand
    const associatedBrandId = userMetadata?.invited_to_brand || appMetadata?.invited_to_brand;
    // Example 3: Invite might relate to a specific workflow
    const associatedWorkflowId = userMetadata?.invited_from_workflow || appMetadata?.invited_from_workflow;

    if (!assignedRole) {
      console.warn(`No role found in metadata for user ${userId}. Cannot assign permissions.`);
      // Decide if this is an error or just skipping permission assignment
      // For now, let's assume it's okay if no role was specified in the invite metadata
      return NextResponse.json({ success: true, message: 'Invite confirmed, no specific role metadata found to assign.' });
    }

    // Ensure role is valid
    const validRoles: Database['public']['Enums']['user_role'][] = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(assignedRole)) {
         console.error(`Invalid role found in metadata for user ${userId}: ${assignedRole}`);
         return handleApiError(new Error('Invalid role specified in invite metadata'), 'Invalid role in invite', 400);
    }

    const supabase = createSupabaseAdminClient();

    // --- Apply Permissions ---
    // This logic needs to be adapted based on your actual permission model.
    // Common scenarios:
    // 1. Assigning a system-wide role (less likely based on UI)
    // 2. Assigning a brand-specific role

    if (associatedBrandId) {
      console.log(`Assigning role '${assignedRole}' to user ${userId} for brand ${associatedBrandId}`);
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .upsert({
          user_id: userId,
          brand_id: associatedBrandId,
          role: assignedRole,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, brand_id' }); // Update if permission already exists

      if (permissionError) {
        console.error(`Failed to assign brand permission for user ${userId}, brand ${associatedBrandId}:`, permissionError);
        throw permissionError;
      }
      console.log(`Successfully assigned brand permission.`);
    
    } else if (associatedWorkflowId) {
        // If the invite was specific to a workflow, maybe update workflow_invitations status
        // or assign permissions differently. Let's assume for now it implies brand permission
        // based on the workflow's brand.
        console.log(`Invite associated with workflow ${associatedWorkflowId}. Attempting to find brand and assign permission.`);
        
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .select('brand_id')
            .eq('id', associatedWorkflowId)
            .maybeSingle();
            
        if(wfError) {
             console.error(`Error fetching workflow ${associatedWorkflowId} to determine brand:`, wfError);
             throw wfError;
        }
        
        if(workflow?.brand_id) {
            console.log(`Assigning role '${assignedRole}' to user ${userId} for brand ${workflow.brand_id} (via workflow invite)`);
            const { error: permissionError } = await supabase
                .from('user_brand_permissions')
                .upsert({
                user_id: userId,
                brand_id: workflow.brand_id,
                role: assignedRole,
                updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, brand_id' });

            if (permissionError) {
                console.error(`Failed to assign brand permission for user ${userId}, brand ${workflow.brand_id}:`, permissionError);
                throw permissionError;
            }
            console.log(`Successfully assigned brand permission via workflow invite.`);
        } else {
             console.warn(`Workflow ${associatedWorkflowId} not found or has no associated brand. Cannot assign permission.`);
             // Return success but indicate permission wasn't assigned
             return NextResponse.json({ success: true, message: 'Invite confirmed, but associated workflow/brand not found for permission assignment.' });
        }

    } else {
      // If no specific brand/workflow association, maybe assign a default role or log a warning
      console.warn(`Invite for user ${userId} confirmed with role '${assignedRole}' but no associated brand/workflow found in metadata. Permissions not assigned.`);
       // Return success but indicate permission wasn't assigned
      return NextResponse.json({ success: true, message: 'Invite confirmed, but no brand/workflow association found for permission assignment.' });
    }

    // TODO: Add logic here to update invitation status in `user_invitations` or `workflow_invitations` if needed.
    // This might involve finding the original invite record based on email and updating its status to 'accepted'.
    // Example (if using user_invitations and email is unique identifier for pending invites):
    /*
    const { error: updateInviteError } = await supabase
        .from('user_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('email', userEmail)
        .eq('status', 'pending'); // Only update pending invites

    if (updateInviteError) {
        console.warn(`Failed to update status for invitation email ${userEmail}:`, updateInviteError);
        // Decide if this is critical - maybe not, as permissions are assigned.
    }
    */

    return NextResponse.json({ success: true, message: 'Invite process completed successfully.' });

  } catch (error: any) {
    return handleApiError(error, 'Failed to complete invite process');
  }
}); 