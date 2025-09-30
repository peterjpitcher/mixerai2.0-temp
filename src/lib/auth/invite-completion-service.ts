import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Define UserRoles type alias locally for convenience if needed, or use directly
type UserRoles = Database['public']['Enums']['user_role'];

interface InviteMetadata {
  source: 'direct_admin' | 'brand_assignment' | 'workflow_assignment' | 'unknown';
  intendedRole: UserRoles | null;
  brandIdForPermission: string | null;
  workflowIdForContext: string | null;
  stepIdForAssignment: string | null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function parseInviteMetadata(appMetadata: Record<string, unknown>): InviteMetadata {
  const metadata = appMetadata || {};

  const intendedRole = (metadata.intended_role || metadata.role) as UserRoles | undefined;
  const invitedToBrand = coerceString(
    metadata.invited_to_brand_id ?? metadata.assigned_as_brand_admin_for_brand_id ?? metadata.brand_id
  );
  const workflowId = coerceString(metadata.invited_from_workflow);
  const stepId = coerceString(metadata.step_id_for_assignment ?? metadata.workflow_step_id);

  const inviteType = typeof metadata.invite_type === 'string'
    ? metadata.invite_type.toLowerCase()
    : undefined;

  if (inviteType === 'direct_user_invite' && intendedRole) {
    return {
      source: 'direct_admin',
      intendedRole,
      brandIdForPermission: invitedToBrand,
      workflowIdForContext: null,
      stepIdForAssignment: null,
    };
  }

  if (
    (inviteType === 'brand_admin_invite' || inviteType === 'brand_admin_invite_on_update' || inviteType === 'brand_assignment_invite') &&
    intendedRole &&
    invitedToBrand
  ) {
    return {
      source: 'brand_assignment',
      intendedRole,
      brandIdForPermission: invitedToBrand,
      workflowIdForContext: null,
      stepIdForAssignment: null,
    };
  }

  if (workflowId && intendedRole) {
    return {
      source: 'workflow_assignment',
      intendedRole,
      brandIdForPermission: invitedToBrand,
      workflowIdForContext: workflowId,
      stepIdForAssignment: stepId,
    };
  }

  return {
    source: 'unknown',
    intendedRole: intendedRole ?? null,
    brandIdForPermission: invitedToBrand,
    workflowIdForContext: workflowId,
    stepIdForAssignment: stepId,
  };
}


async function assignBrandPermissions(userId: string, brandId: string, role: UserRoles, supabase: SupabaseClient<Database>) {
  console.log(`[InviteService] Assigning role '${role}' to user ${userId} for brand ${brandId}`);
  
  // The role from UserRoles should now directly map to the role in user_brand_permissions
  const brandPermissionRole = role; // Removed mapping to 'admin'
  
  const { error } = await supabase
    .from('user_brand_permissions')
    .upsert({ user_id: userId, brand_id: brandId, role: brandPermissionRole }, { onConflict: 'user_id,brand_id' });
  if (error) throw new Error(`DB_BRAND_PERMISSION_FAIL: ${error.message}`);
  console.log(`[InviteService] Successfully assigned brand permission (as '${brandPermissionRole}') for user ${userId}, brand ${brandId}.`);
}

async function finalizeWorkflowUser(
    userId: string, userEmail: string, workflowId: string, 
    stepId: number | string | null, // stepId should be the UUID string now
    brandId: string, role: UserRoles, 
    supabase: SupabaseClient<Database>
) {
  console.log(`[InviteService] Finalizing workflow user ${userId} for workflow ${workflowId}, brand ${brandId}, role ${role}`);
  // 1. Assign brand permission (can be called here if not guaranteed to be called before)
  // await assignBrandPermissions(userId, brandId, role, supabase);

  // 2. Update workflow_invitations status
  const { error: updateWfInviteError } = await supabase
    .from('workflow_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('email', userEmail)
    .eq('workflow_id', workflowId)
    .eq('status', 'pending');
  if (updateWfInviteError) console.warn(`[InviteService] Failed to update workflow_invitation status: ${updateWfInviteError.message}`);
  else console.log(`[InviteService] Updated workflow_invitation status for ${userEmail}, workflow ${workflowId}`);

  // 3. Ensure workflow_user_assignments
  if (stepId !== null && typeof stepId === 'string') { // Ensure stepId is a string (UUID)
    const { error: assignError } = await supabase
      .from('workflow_user_assignments')
      .upsert({ workflow_id: workflowId, step_id: stepId, user_id: userId }, { onConflict: 'workflow_id,step_id,user_id' }); // Use stepId directly
    if (assignError) console.warn(`[InviteService] Failed to upsert workflow_user_assignment: ${assignError.message}`);
    else console.log(`[InviteService] Ensured workflow_user_assignment for user ${userId}, workflow ${workflowId}, step ${stepId}`);
  } else if (stepId !== null) {
    console.warn(`[InviteService] stepId for workflow user assignment was not a string (expected UUID): ${stepId}`);
  } else {
    console.warn(`[InviteService] No stepId provided for workflow user assignment for user ${userId}, workflow ${workflowId}.`);
  }
}

async function cleanupAppMetadata(userId: string, appMetadata: Record<string, unknown>, supabase: SupabaseClient<Database>) {
    const metadataToClear: Record<string, undefined> = {
        intended_role: undefined, invited_to_brand_id: undefined, invite_type: undefined,
        assigned_as_brand_admin_for_brand_id: undefined, invited_from_workflow: undefined, role: undefined,
        step_id_for_assignment: undefined, 
        // Add any other invite-specific keys used by your inviter functions
    };
    const newAppMetadata = { ...appMetadata };
    for (const key in metadataToClear) {
        if (newAppMetadata.hasOwnProperty(key)) { // Check if key exists before deleting
            delete newAppMetadata[key];
        }
    }
    const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: newAppMetadata });
    if (error) console.warn(`[InviteService] Failed to cleanup app_metadata for user ${userId}: ${error.message}`);
    else console.log(`[InviteService] Cleaned up app_metadata for user ${userId}`);
}

// Main function to be called by the API route
export async function processInviteCompletion(
    user: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
    supabase: SupabaseClient<Database>
): Promise<{ success: boolean; message: string; httpStatus?: number; data?: Record<string, unknown> }> {
    const userId = user.id;
    const userEmail = user.email;
    const appMetadata = user.app_metadata || {};
    const existingUserMetadata = user.user_metadata || {};

    const parsedMeta = parseInviteMetadata(appMetadata);

    if (!parsedMeta.intendedRole) {
        console.warn(`[InviteService] Missing intended role for invite completion. user=${userId}`, appMetadata);
        return { success: false, message: 'Invite metadata is missing the intended role. Please request a new invite.', httpStatus: 400 };
    }

    if (parsedMeta.source === 'unknown') {
        console.warn(`[InviteService] Unrecognised invite metadata. user=${userId}`, appMetadata);
        return { success: false, message: 'Invite metadata is incomplete. Please request a new invite.', httpStatus: 400 };
    }

    // Role validation using the defined UserRoles type and values from the generated types
    const validRoles: ReadonlyArray<UserRoles> = ['admin', 'editor', 'viewer']; // These are the literal types of UserRoles
    if (!validRoles.includes(parsedMeta.intendedRole)) {
        console.error(`[InviteService] Invalid role specified: ${parsedMeta.intendedRole} for user ${userId}`);
        await cleanupAppMetadata(userId, appMetadata, supabase); // Cleanup before returning error
        return { success: false, message: `Invalid role specified: ${parsedMeta.intendedRole}`, httpStatus: 400 };
    }

    try {
        // Ensure the global role is set in user_metadata based on the invite
        if (parsedMeta.intendedRole) {
            const updatedUserMetadata = { 
                ...existingUserMetadata, 
                role: parsedMeta.intendedRole 
            };
            const updatedAppMetadata = {
                ...appMetadata,
                global_role: parsedMeta.intendedRole,
                roles: Array.isArray(appMetadata.roles)
                  ? Array.from(new Set([...(appMetadata.roles as string[]), parsedMeta.intendedRole]))
                  : [parsedMeta.intendedRole],
            };
            const { error: roleSetError } = await supabase.auth.admin.updateUserById(
                userId,
                { 
                    user_metadata: updatedUserMetadata,
                    app_metadata: updatedAppMetadata,
                }
            );
            if (roleSetError) {
                console.error(`[InviteService] Failed to set global role '${parsedMeta.intendedRole}' in user_metadata for user ${userId}:`, roleSetError.message);
                // Decide if this is a critical failure. For now, log and continue, 
                // as permissions might still be assigned, but global role might be missing.
                // throw new Error(`DB_GLOBAL_ROLE_SET_FAIL: ${roleSetError.message}`); 
            }
            console.log(`[InviteService] Global role '${parsedMeta.intendedRole}' set in user_metadata for user ${userId}.`);
        }

        if (parsedMeta.source === 'direct_admin' && parsedMeta.intendedRole === 'admin' && !parsedMeta.brandIdForPermission) {
            // The general role update above already handles setting the 'admin' role.
            // assignSuperadminRole can be considered redundant if its only job is to set user_metadata.role = 'admin'.
            // If assignSuperadminRole has other side effects, it should be kept and potentially refactored.
            // For now, as it ONLY sets the role, we can comment it out or remove it if the general update is sufficient.
            // await assignSuperadminRole(userId, existingUserMetadata, supabase); 
            // No specific action needed here anymore if the role is set above.
            console.log(`[InviteService] Processing direct_admin invite for superadmin role (already handled by general role update).`);
        } else if (parsedMeta.brandIdForPermission && parsedMeta.intendedRole) {
            // This handles 'direct_admin' to a brand, 'brand_assignment', and 'workflow_assignment'
            await assignBrandPermissions(userId, parsedMeta.brandIdForPermission, parsedMeta.intendedRole, supabase);
            
            if (parsedMeta.source === 'workflow_assignment' && parsedMeta.workflowIdForContext && parsedMeta.brandIdForPermission) {
                // Ensure role for workflow context is correctly derived if it can differ from brand permission role
                if (!parsedMeta.stepIdForAssignment) {
                    console.warn(`[InviteService] Workflow invite missing step assignment. user=${userId}, workflow=${parsedMeta.workflowIdForContext}`);
                }
                const workflowContextRole = parsedMeta.intendedRole; // Assuming it's the same for now
                await finalizeWorkflowUser(
                    userId,
                    userEmail!,
                    parsedMeta.workflowIdForContext,
                    parsedMeta.stepIdForAssignment,
                    parsedMeta.brandIdForPermission,
                    workflowContextRole,
                    supabase
                );
            }
        } else {
             console.warn(`[InviteService] Unhandled permission assignment case for user ${userId}. ParsedMeta:`, parsedMeta);
             // Cleanup metadata even for unhandled cases
             await cleanupAppMetadata(userId, appMetadata, supabase);
             return { success: false, message: 'Invite metadata did not include a target brand. Please request a new invite.', httpStatus: 400 };
        }
        
        await cleanupAppMetadata(userId, appMetadata, supabase);
        return { success: true, message: 'Invite process completed successfully. Permissions assigned.', httpStatus: 200 };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`[InviteService] Error processing invite for user ${userId}:`, errorMessage, errorStack);
        // Do not cleanup metadata on error, as it might be needed for reprocessing or debugging
        if (errorMessage.startsWith('DB_')) {
             return { success: false, message: `Database operation failed: ${errorMessage}`, httpStatus: 500 };
        }
        return { success: false, message: `Failed to complete invite process: ${errorMessage}`, httpStatus: 500 };
    }
} 
