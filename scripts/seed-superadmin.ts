// scripts/seed-superadmin.ts
// Conceptual script for seeding the initial Superadmin user.
// This script is intended to be run in an environment where Supabase JS client can be initialized
// and environment variables for Supabase connection and Superadmin credentials are available.

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Ensure these environment variables are set in your execution environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INITIAL_SUPERADMIN_EMAIL = process.env.INITIAL_SUPERADMIN_EMAIL || 'peter.pitcher@example.com'; // Default for safety, should be overridden
const INITIAL_SUPERADMIN_PASSWORD = process.env.INITIAL_SUPERADMIN_PASSWORD;
const INITIAL_SUPERADMIN_FULL_NAME = process.env.INITIAL_SUPERADMIN_FULL_NAME || 'Peter Pitcher';

async function seedSuperadmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
    process.exit(1);
  }
  if (!INITIAL_SUPERADMIN_PASSWORD) {
    console.error('Error: INITIAL_SUPERADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }
  if (INITIAL_SUPERADMIN_EMAIL === 'peter.pitcher@example.com') {
    console.warn('Warning: INITIAL_SUPERADMIN_EMAIL is using the default placeholder. Please set it in environment variables.');
  }

  let supabaseAdmin: SupabaseClient;
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (e: any) {
    console.error('Failed to create Supabase admin client:', e.message);
    process.exit(1);
  }

  console.log(`Attempting to seed Superadmin with email: ${INITIAL_SUPERADMIN_EMAIL}`);

  try {
    let existingUser: User | null | undefined = undefined;
    
    // Attempt to list users with a filter. This is a common workaround if getUserByEmail is not directly available.
    // The `filter` string format might need adjustment based on exact GoTrue API expectations.
    const { data: listResponse, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      // The `filter` property might not be strongly typed in all client versions for this specific use.
      // We are attempting to use it based on underlying GoTrue capabilities.
      filter: `email = "${INITIAL_SUPERADMIN_EMAIL}"`,
      page: 1,
      perPage: 1
    });

    if (listError) {
      console.error(`Error when trying to list users to check for Superadmin existence: ${listError.message}`);
      // Don't necessarily exit; proceed to attempt creation, which has its own error handling.
    }

    if (listResponse && listResponse.users && listResponse.users.length > 0) {
      if (listResponse.users[0].email === INITIAL_SUPERADMIN_EMAIL) {
        existingUser = listResponse.users[0];
      }
    }

    if (existingUser) {
      console.log(`User ${INITIAL_SUPERADMIN_EMAIL} already exists (ID: ${existingUser.id}). Ensuring Superadmin role.`);
      const currentRole = existingUser.user_metadata?.role;
      const currentFullName = existingUser.user_metadata?.full_name;
      let needsUpdate = false;
      let newMeta = { ...existingUser.user_metadata };

      if (currentRole !== 'admin') {
        console.log(`User role is '${currentRole}', updating to 'admin'.`);
        newMeta.role = 'admin';
        needsUpdate = true;
      }
      if (INITIAL_SUPERADMIN_FULL_NAME && currentFullName !== INITIAL_SUPERADMIN_FULL_NAME) {
        console.log(`User full_name is '${currentFullName}', updating to '${INITIAL_SUPERADMIN_FULL_NAME}'.`);
        newMeta.full_name = INITIAL_SUPERADMIN_FULL_NAME;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { user_metadata: newMeta }
        );
        if (updateError) {
          console.error(`Failed to update user ${INITIAL_SUPERADMIN_EMAIL} to Superadmin:`, updateError.message);
          throw updateError;
        }
        console.log(`Successfully updated user ${INITIAL_SUPERADMIN_EMAIL} to ensure Superadmin role and details.`);
      } else {
        console.log(`User ${INITIAL_SUPERADMIN_EMAIL} already has Superadmin role and correct details. No update needed.`);
      }
    } else {
      console.log(`User ${INITIAL_SUPERADMIN_EMAIL} not found by listUsers. Attempting to create Superadmin user.`);
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: INITIAL_SUPERADMIN_EMAIL,
        password: INITIAL_SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          full_name: INITIAL_SUPERADMIN_FULL_NAME
        }
      });
      if (createError) {
        // Check if error is because user already exists (this specific message can vary)
        if (createError.message.match(/User already registered/i) || createError.message.match(/email.*already.*exists/i)) {
          console.warn(`CreateUser failed because user ${INITIAL_SUPERADMIN_EMAIL} likely already exists. Please verify their Superadmin role manually if update didn't catch it.`);
          // Optionally, try to fetch again here if a reliable method is found, then update.
        } else {
          console.error(`Failed to create Superadmin user ${INITIAL_SUPERADMIN_EMAIL}:`, createError.message);
          throw createError;
        }
      }
      if (newUserData?.user) { // Check if user object exists in newUserData
        console.log(`Superadmin user ${INITIAL_SUPERADMIN_EMAIL} created successfully (ID: ${newUserData.user.id}).`);
      } else if (!createError) { // If no error but also no user data, it's an unexpected state
        console.warn(`Superadmin user creation for ${INITIAL_SUPERADMIN_EMAIL} resulted in no error but no user data was returned.`);
      }
      console.log('Public profile record should be created automatically by database trigger upon new user creation in auth.users.');
    }

    console.log('Superadmin seeding process completed.');

  } catch (error: any) {
    console.error('An error occurred during the Superadmin seeding process:', error.message);
    process.exit(1);
  }
}

seedSuperadmin();
