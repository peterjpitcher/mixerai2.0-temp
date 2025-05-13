import { SupabaseClient, User } from '@supabase/supabase-js';
// ApiError import removed as it's not directly used and might not be exported as such.
// Errors from rpc calls are typically typed as PostgrestError or a generic Error.

/**
 * Retrieves a Supabase authenticated user by their email using an RPC call.
 * This function should be called with a Supabase client initialized with admin privileges (service role key).
 * 
 * @param email The email address of the user to find.
 * @param supabaseAdmin An initialized Supabase client with admin privileges.
 * @returns The Supabase User object if found, otherwise null.
 */
export async function getUserAuthByEmail(
  email: string,
  supabaseAdmin: SupabaseClient
): Promise<User | null> {
  if (!email || !supabaseAdmin) {
    console.error('[getUserAuthByEmail] Email and Supabase admin client are required.');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_user_by_email', {
      user_email: email.toLowerCase(), // Ensure email is lowercased for consistent lookup
    });

    if (error) {
      console.error(`[getUserAuthByEmail] RPC error for email ${email}:`, error);
      // Differentiate between "user not found" (not an error) and actual DB errors if possible
      // For now, any RPC error results in null.
      return null;
    }

    // The RPC function `RETURNS SETOF auth.users`, so data will be an array.
    // If a user is found, the array will contain one user object.
    // If not found, the array will be empty.
    if (data && Array.isArray(data) && data.length > 0) {
      return data[0] as User; // Assuming the RPC returns objects compatible with the User type
    }
    
    return null; // User not found or RPC returned empty array
  } catch (e) {
    console.error(`[getUserAuthByEmail] Unexpected exception for email ${email}:`, e);
    return null;
  }
}

/**
 * Invites a new user via Supabase Auth and immediately updates their app_metadata.
 * This two-step process ensures that critical invitation context is stored securely.
 * 
 * @param email The email address of the user to invite.
 * @param appMetadata The application-specific metadata (roles, entity IDs) to store securely.
 * @param userMetadata Optional user-modifiable metadata (name, etc.) for the initial invite.
 * @param supabaseAdmin An initialized Supabase client with admin privileges.
 * @returns An object containing the invited User object and an error if one occurred.
 */
export async function inviteNewUserWithAppMetadata(
  email: string,
  appMetadata: object,
  supabaseAdmin: SupabaseClient,
  userMetadata?: object // userMetadata is now optional and last
): Promise<{ user: User | null; error: Error | null }> { // Return type refined
  if (!email || !appMetadata || !supabaseAdmin) {
    console.error('[inviteNewUserWithAppMetadata] Email, appMetadata, and Supabase admin client are required.');
    return { user: null, error: new Error('Missing required parameters for inviteNewUserWithAppMetadata.') };
  }

  let invitedUser: User | null = null;

  try {
    // Step 1: Invite the user via email
    // The redirectTo URL should be a global constant or configurable, pointing to your frontend invite completion page.
    const inviteRedirectTo = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` : '/auth/confirm';
    
    const { data: inviteResponseData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: inviteRedirectTo,
        data: userMetadata || {} // Pass user-modifiable metadata here
      }
    );

    if (inviteError) {
      console.error(`[inviteNewUserWithAppMetadata] Error inviting user ${email}:`, inviteError);
      // It's possible the user already exists. The calling function should have already checked this.
      // If inviteUserByEmail fails because user exists, it might return user data in error.details or similar.
      // However, this function assumes it's called for genuinely NEW users based on prior checks.
      return { user: null, error: inviteError };
    }

    if (!inviteResponseData || !inviteResponseData.user) {
      console.error(`[inviteNewUserWithAppMetadata] Invite call for ${email} succeeded but returned no user data.`);
      return { user: null, error: new Error('Invite successful but no user data returned.') };
    }
    invitedUser = inviteResponseData.user;

    // Step 2: Update the newly invited user with secure app_metadata
    // Only proceed if user was successfully created/invited from step 1.
    const { data: updatedUserData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      invitedUser.id,
      {
        app_metadata: { ...appMetadata } // Spread to ensure a new object if appMetadata might be reused
      }
    );

    if (updateError) {
      console.error(`[inviteNewUserWithAppMetadata] Error setting app_metadata for user ${invitedUser.id} (${email}):`, updateError);
      // Attempt to delete the user if metadata update fails
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(invitedUser.id);
      if (deleteError) {
        console.error(`[inviteNewUserWithAppMetadata] Failed to delete user ${invitedUser.id} after metadata update error:`, deleteError);
        // Log for manual review
        return { user: invitedUser, error: new Error('Critical: Metadata update failed and user deletion also failed. Manual review required.') };
      }
      return { user: null, error: new Error('Metadata update failed. User was deleted to maintain security.') };
    }

    console.log(`[inviteNewUserWithAppMetadata] Successfully invited ${email} and set app_metadata for user ID ${invitedUser.id}.`);
    // The updatedUserData.user might contain the merged metadata, return that if preferred.
    return { user: updatedUserData.user || invitedUser, error: null };

  } catch (e: any) {
    console.error(`[inviteNewUserWithAppMetadata] Unexpected exception for email ${email}:`, e);
    return { user: invitedUser, error: e }; // Return partially successful state if user was created before exception
  }
}

// Placeholder for the second helper function to be implemented in the next step
// export async function inviteNewUserWithAppMetadata(...) { ... } 