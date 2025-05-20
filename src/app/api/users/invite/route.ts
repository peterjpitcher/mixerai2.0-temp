import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAdminAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
// import { verifyEmailTemplates } from '@/lib/auth/email-templates'; // verifyEmailTemplates only logs in dev, can be removed if not essential for flow logic
import { getUserAuthByEmail, inviteNewUserWithAppMetadata } from '@/lib/auth/user-management';

/**
 * POST endpoint to invite a new user
 * Only global administrators can invite users.
 */
export const POST = withAdminAuth(async (request: NextRequest, adminUser) => {
  console.log('[API /api/users/invite] Received POST request');
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    console.log('[API /api/users/invite] Request body:', JSON.stringify(body));

    // await verifyEmailTemplates(); // Removed as it only logs a reminder in dev

    if (!body.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!body.role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(body.role.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const emailToInvite = body.email.toLowerCase();

    // Step 1: Check if user already exists in auth.users
    console.log(`[API /api/users/invite] Checking if user ${emailToInvite} already exists...`);
    const existingUser = await getUserAuthByEmail(emailToInvite, supabase);

    if (existingUser) {
      console.log(`[API /api/users/invite] User ${emailToInvite} already exists with ID: ${existingUser.id}.`);
      // As per plan, deferring full permission update for existing user for now.
      // If brand_id and role are provided, this is where one would update user_brand_permissions.
      // For this phase, simply inform that user exists.
      let message = `User with email ${emailToInvite} already exists.`;
      if (body.brand_id && body.role) {
        // Placeholder: Logic to update permissions for existingUser.id, body.brand_id, body.role
        console.log(`[API /api/users/invite] TODO: Update permissions for existing user ${existingUser.id} for brand ${body.brand_id} with role ${body.role}.`);
        message += ` Manual permission update may be required or use dedicated permission management tools.`
      }
      return NextResponse.json(
        { success: false, error: message, user_exists: true, user_id: existingUser.id },
        { status: 409 } // Conflict, user already exists
      );
    }

    // Step 2: User does not exist, proceed to invite
    console.log(`[API /api/users/invite] User ${emailToInvite} does not exist. Proceeding with invitation by admin: ${adminUser.id}`);
    
    const appMetadata = {
      intended_role: body.role.toLowerCase(),
      invited_to_brand_id: body.brand_id || null, // Ensure null if not provided
      inviter_id: adminUser.id,
      invite_type: 'direct_user_invite'
    };

    const userMetadataPayload = {
      full_name: body.full_name || '',
      job_title: body.job_title || '',
      company: body.company || '',
      role: body.role.toLowerCase()
    };

    const { user: invitedUser, error: inviteError } = await inviteNewUserWithAppMetadata(
      emailToInvite,
      appMetadata,
      supabase,
      userMetadataPayload
    );

    if (inviteError || !invitedUser) {
      console.error(`[API /api/users/invite] Error inviting user ${emailToInvite} or setting app_metadata:`, inviteError);
      // inviteNewUserWithAppMetadata handles internal errors, but we check its return
      
      // Check for our custom rate limit error
      if (inviteError && (inviteError as any).status === 429) {
        return NextResponse.json(
          { success: false, error: inviteError.message || 'Rate limit exceeded. Please try again shortly.' },
          { status: 429 }
        );
      }
      return handleApiError(inviteError || new Error('Invitation process failed internally.'), 'Failed to invite user');
    }

    console.log(`[API /api/users/invite] Successfully invited user ${invitedUser.email} (ID: ${invitedUser.id}) and app_metadata set.`);
    
    // Brand assignment is now deferred to /api/auth/complete-invite based on app_metadata.invited_to_brand_id
    // The old direct insert to user_brand_permissions is removed from here.

    console.log('[API /api/users/invite] Invitation process for new user completed successfully.');
    return NextResponse.json({ 
      success: true, 
      data: { 
        user: invitedUser, // Contains the newly invited user object with app_metadata (partially)
        message: 'Invitation sent successfully. User will need to complete setup via email.'
      }
    });

  } catch (error: any) {
    console.error('[API /api/users/invite] Unhandled error in POST handler:', error);
    return handleApiError(error, 'Failed to process user invitation');
  }
}); 