import { createSupabaseAdminClient } from '@/lib/supabase/client';
// import { v4 as uuidv4 } from 'uuid'; // For generating tokens if needed here, or in RPC
// import { verifyEmailTemplates } from '@/lib/auth/email-templates'; // May not be needed if Supabase handles email sending

interface InviteUserOptions {
  email: string;
  fullName?: string;
  intendedRole: 'admin' | 'editor' | 'viewer'; // Or your specific UserRoles type
  invitedFrom: 'workflow' | 'user_invite_page' | 'brand_assignment'; // More specific sources
  inviterUserId?: string; // ID of the user performing the invitation
  appMetadata?: Record<string, unknown>; // Base app_metadata
  workflowId?: string;
  stepId?: string | number; // This should ideally be the DB UUID of the step if available
  actualWorkflowBrandId?: string; // The actual brand_id of the workflow if invitedFrom is 'workflow'
  brandIdForPermission?: string; // If inviting to a specific brand context outside of workflows
}

interface InviteUserResult {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string; // ID of the invited/existing user
}

/**
 * Centralised service to invite a new user or handle an existing user
 * based on the invitation context.
 *
 * This service will be responsible for:
 * 1. Checking if a user already exists with the given email.
 * 2. If user does not exist, inviting them via Supabase Auth admin.
 * 3. Constructing appropriate app_metadata for the invitation.
 * 4. Potentially logging the invitation attempt (e.g., to a workflow_invitations table).
 *    (Logging to workflow_invitations might be better handled by specific RPC calls like create_workflow_and_log_invitations)
 */
export async function inviteUser(options: InviteUserOptions): Promise<InviteUserResult> {
  const supabase = createSupabaseAdminClient();
  const { 
    email,
    fullName,
    intendedRole,
    invitedFrom,
    inviterUserId,
    appMetadata = {},
    workflowId,
    stepId,
    actualWorkflowBrandId,
    brandIdForPermission 
  } = options;

  try {
    // 1. Check if user already exists (this might be redundant if the calling API route already did this)
    //    However, a central service should be robust.
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles') // Assuming you have a 'profiles' table linked to auth.users
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
      console.error(`[invitationService] Error fetching user by email ${email}:`, fetchError);
      return { success: false, error: 'Error checking existing user.' };
    }

    if (existingUser) {
      // User already exists. What should happen? 
      // - For workflows, they might just be added to the step if not already.
      // - For direct invites, it might be an error or a notification.
      // This service might need more nuanced return types or actions based on context.
      // For now, let's assume if they exist, we return their ID and a message.
      // The calling API will then decide how to proceed (e.g. assign to workflow step).
      console.log(`[invitationService] User ${email} already exists with ID ${existingUser.id}.`);
      // TODO: Potentially update existing user's role or app_metadata if the invitation implies a change?
      // This needs careful consideration to avoid unintended privilege escalation or data overwrites.
      return { success: true, message: 'User already exists.', userId: existingUser.id };
    }

    // 2. User does not exist, proceed with invitation
    const finalAppMetadata: Record<string, unknown> = {
      ...appMetadata,
      invited_by: inviterUserId,
      source: invitedFrom, 
      // Note: 'intended_role' or 'role' is set below based on context for parser compatibility
    };
    
    if (fullName) {
      finalAppMetadata.full_name = fullName;
    }

    if (invitedFrom === 'workflow') {
      finalAppMetadata.role = intendedRole; // For parser: metadata.role
      if (workflowId) finalAppMetadata.invited_from_workflow = workflowId;
      if (stepId) finalAppMetadata.step_id_for_assignment = stepId; 
      if (actualWorkflowBrandId) finalAppMetadata.invited_to_brand_id = actualWorkflowBrandId; // For parser: brandIdForPermission for workflow's brand
    
    } else if (invitedFrom === 'user_invite_page') {
      finalAppMetadata.invite_type = 'direct_user_invite'; // For parser
      finalAppMetadata.intended_role = intendedRole; // Parser specific for direct_admin: metadata.intended_role
      if (brandIdForPermission) {
        finalAppMetadata.invited_to_brand_id = brandIdForPermission; // For direct admin invite to a specific brand context
      }
    } else if (invitedFrom === 'brand_assignment') {
      // This case needs alignment with parseInviteMetadata in invite-completion-service
      // For a generic brand assignment invite, we might set:
      finalAppMetadata.invite_type = 'brand_assignment_invite'; // A new distinct type for parser, or align with existing
      finalAppMetadata.intended_role = intendedRole;
      if (brandIdForPermission) finalAppMetadata.invited_to_brand_id = brandIdForPermission;
      console.warn(`[invitationService] 'brand_assignment' invite source used; ensure invite-completion-service can parse this or related invite_type.`);
    }

    console.log(`[invitationService] Inviting user ${email} with app_metadata:`, finalAppMetadata);

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: finalAppMetadata,
    });

    if (inviteError) {
      console.error(`[invitationService] Error inviting user ${email} via Supabase Auth:`, inviteError);
      // TODO: Map Supabase errors to more user-friendly messages if needed
      return { success: false, error: inviteError.message || 'Failed to send invitation.' };
    }

    if (!inviteData || !inviteData.user) {
      console.error(`[invitationService] Supabase Auth invite for ${email} did not return user data.`);
      return { success: false, error: 'Invitation sent but no user data returned from auth provider.' };
    }

    // 3. Logging invitation (Optional - consider if RPCs already do this comprehensively)
    // Example: If you have a `workflow_invitations` table and this invite is for a workflow
    // if (invitedFrom === 'workflow' && workflowId && stepId && inviteData.user.id) {
    //   const { error: logError } = await supabase.from('workflow_invitations').insert({
    //     workflow_id: workflowId,
    //     step_id: stepId, // Ensure type consistency if stepId can be string
    //     email: email,
    //     role: intendedRole,
    //     user_id: inviteData.user.id, // Link to the created auth user
    //     status: 'pending', // Or use inviteData.user.email_confirmed_at to derive status
    //     // invite_token: ??? // Supabase handles token internally for auth.admin.inviteUserByEmail
    //     // expires_at: ??? // Supabase invite links have their own expiry
    //   });
    //   if (logError) {
    //     console.warn(`[invitationService] Failed to log workflow invitation for ${email}:`, logError);
    //     // Non-fatal, but good to know
    //   }
    // }

    return { 
      success: true, 
      message: 'Invitation sent successfully.', 
      userId: inviteData.user.id 
    };

  } catch (error) {
    console.error(`[invitationService] Unexpected error during invitation process for ${email}:`, error);
    return { success: false, error: (error as Error).message || 'An unexpected error occurred.' };
  }
} 