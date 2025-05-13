"use strict";
// scripts/seed-superadmin.ts
// Conceptual script for seeding the initial Superadmin user.
// This script is intended to be run in an environment where Supabase JS client can be initialized
// and environment variables for Supabase connection and Superadmin credentials are available.
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
// Ensure these environment variables are set in your execution environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INITIAL_SUPERADMIN_EMAIL = process.env.INITIAL_SUPERADMIN_EMAIL || 'peter.pitcher@example.com'; // Default for safety, should be overridden
const INITIAL_SUPERADMIN_PASSWORD = process.env.INITIAL_SUPERADMIN_PASSWORD;
const INITIAL_SUPERADMIN_FULL_NAME = process.env.INITIAL_SUPERADMIN_FULL_NAME || 'Peter Pitcher';
async function seedSuperadmin() {
    var _a, _b, _c;
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
    let supabaseAdmin;
    try {
        supabaseAdmin = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    catch (e) {
        console.error('Failed to create Supabase admin client:', e.message);
        process.exit(1);
    }
    console.log(`Attempting to seed Superadmin with email: ${INITIAL_SUPERADMIN_EMAIL}`);
    try {
        // Check if user already exists.
        // NOTE: The exact method supabase.auth.admin.getUserByEmail(email) was conceptual.
        // The actual method to fetch/check a user by email via the admin API in the version of
        // supabase-js being used should be verified. Alternatives like listUsers with a filter
        // might be necessary if getUserByEmail is not available or behaves differently.
        // For this conceptual script, we proceed with the planned getUserByEmail.
        const { data: existingUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(INITIAL_SUPERADMIN_EMAIL);
        if (getUserError && getUserError.message !== 'User not found') { // User not found is not a fatal error here
            console.error('Error fetching user by email:', getUserError.message);
            throw getUserError;
        }
        const existingUser = existingUserData === null || existingUserData === void 0 ? void 0 : existingUserData.user;
        if (existingUser) {
            console.log(`User ${INITIAL_SUPERADMIN_EMAIL} already exists (ID: ${existingUser.id}). Ensuring Superadmin role.`);
            const currentRole = (_a = existingUser.user_metadata) === null || _a === void 0 ? void 0 : _a.role;
            const currentFullName = (_b = existingUser.user_metadata) === null || _b === void 0 ? void 0 : _b.full_name;
            let needsUpdate = false;
            let newMeta = Object.assign({}, existingUser.user_metadata);
            if (currentRole !== 'admin') {
                console.log(`User role is '${currentRole}', updating to 'admin'.`);
                newMeta.role = 'admin';
                needsUpdate = true;
            }
            // Optionally update full_name if it's different or not set, and a default/env var is provided
            if (INITIAL_SUPERADMIN_FULL_NAME && currentFullName !== INITIAL_SUPERADMIN_FULL_NAME) {
                console.log(`User full_name is '${currentFullName}', updating to '${INITIAL_SUPERADMIN_FULL_NAME}'.`);
                newMeta.full_name = INITIAL_SUPERADMIN_FULL_NAME;
                needsUpdate = true;
            }
            if (needsUpdate) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { user_metadata: newMeta });
                if (updateError) {
                    console.error(`Failed to update user ${INITIAL_SUPERADMIN_EMAIL} to Superadmin:`, updateError.message);
                    throw updateError;
                }
                console.log(`Successfully updated user ${INITIAL_SUPERADMIN_EMAIL} to ensure Superadmin role and details.`);
            }
            else {
                console.log(`User ${INITIAL_SUPERADMIN_EMAIL} already has Superadmin role and correct details. No update needed.`);
            }
            // Note: The public.profiles table record should be handled by a trigger on auth.users INSERT.
            // If it's not, you might need to manually upsert into profiles here as well.
        }
        else {
            console.log(`Creating Superadmin user: ${INITIAL_SUPERADMIN_EMAIL}`);
            const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: INITIAL_SUPERADMIN_EMAIL,
                password: INITIAL_SUPERADMIN_PASSWORD,
                email_confirm: true, // Auto-confirm email for Superadmin
                user_metadata: {
                    role: 'admin',
                    full_name: INITIAL_SUPERADMIN_FULL_NAME
                }
            });
            if (createError) {
                console.error(`Failed to create Superadmin user ${INITIAL_SUPERADMIN_EMAIL}:`, createError.message);
                throw createError;
            }
            console.log(`Superadmin user ${INITIAL_SUPERADMIN_EMAIL} created successfully (ID: ${(_c = newUserData.user) === null || _c === void 0 ? void 0 : _c.id}).`);
            console.log('Public profile record should be created automatically by database trigger upon new user creation in auth.users.');
        }
        console.log('Superadmin seeding process completed.');
    }
    catch (error) {
        console.error('An error occurred during the Superadmin seeding process:', error.message);
        process.exit(1);
    }
}
// Execute the seeding function
seedSuperadmin();
