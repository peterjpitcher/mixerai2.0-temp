# User Invitation System Investigation - MixerAI 2.0

This document outlines the investigation into the user invitation system in MixerAI 2.0, addressing issues related to inviting new users and updating existing users across different application features.

## Phase 1: Investigation and Discovery

### 1. Supabase User Invitation Flow

**Objective**: Clarify the standard Supabase methods for inviting new users and how this integrates with profile creation.

**Key Supabase Auth Admin Methods**:

*   **`supabase.auth.admin.inviteUserByEmail(email, options)`**:
    *   **Purpose**: Sends an invitation link to the specified email address. This is the generally recommended method for inviting new users to an application.
    *   **Process**:
        1.  An email is sent to the user containing a unique link.
        2.  The user clicks the link.
        3.  They are typically redirected to a page in the application (specified by `options.redirectTo`) where they can complete their account setup, usually by setting a password.
    *   **Behavior with Existing Users**: If a user with the provided email already exists and is confirmed, an invitation email is typically **not** resent. The method might return user data or an indication that the user already exists. If the user exists but is not confirmed, it might resend a confirmation/invite. This behavior is crucial for application logic to handle correctly (i.e., check if user exists first, then either invite or update permissions).
    *   **`options.redirectTo`**: This URL must be whitelisted in the Supabase project settings under "Auth" -> "Redirect URLs".

*   **`supabase.auth.admin.createUser(attributes)`**:
    *   **Purpose**: Directly creates a new user in the `auth.users` table.
    *   **Attributes**: Can include `email`, `password`, `email_confirm`, `user_metadata`, etc.
    *   **Invitation/Confirmation**:
        *   If a password is not provided during creation, the user will need a way to set one (e.g., through a password reset flow or an invite link generated separately).
        *   If `email_confirm: false` is set (or by default if email confirmations are enabled in Supabase), the user will receive a confirmation email. Clicking this link confirms their email. They might still need to set a password if one wasn't provided.
    *   **Use Case**: Can be used if more control over the user creation process is needed, or if an invitation email is not desired immediately (e.g., creating stub users that will be invited later). However, for a typical "invite user, let them set password" flow, `inviteUserByEmail` is more direct.

*   **`supabase.auth.admin.generateLink(type, email, options)`**:
    *   **Purpose**: Generates various types of links, including `invite`, `magiclink`, `recovery` (password reset), `email_change_current`, `email_change_new`.
    *   **Use Case**: Can be used to manually construct and send invitation or password setup links if `inviteUserByEmail` or `createUser` followed by `resetPasswordForEmail` is not suitable.

**Conclusion for MixerAI**:
For inviting new users who then need to set up their account (primarily set a password), `supabase.auth.admin.inviteUserByEmail()` seems to be the most appropriate and straightforward method. The application logic must:
1.  First, check if a user exists by email.
2.  If the user exists, proceed to update their permissions.
3.  If the user does not exist, call `inviteUserByEmail` to send them an invitation.
4.  Ensure a redirect URL is configured in Supabase (e.g., `your-app.com/auth/complete-invite` or `your-app.com/set-password`) where users land after clicking the invite link to finalize their account.

### 2. Codebase Usage of Supabase Auth Methods

**Objective**: Identify how `inviteUserByEmail` and `createUser` are currently used within the application.

**Findings**:

*   **`supabase.auth.admin.inviteUserByEmail()` is the primary method used for invitations in application routes**:
    *   **`src/app/api/users/invite/route.ts`**: The main user invitation endpoint. It calls `inviteUserByEmail` and passes user metadata (`full_name`, `job_title`, `role`, etc.) in `options.data`. It includes a check for errors from `inviteUserByEmail` like "User with this email already exists".
    *   **`src/app/api/workflows/[id]/invitations/route.ts`**: For inviting users to specific workflow steps. It first checks if a user profile exists by email. If not, it calls `inviteUserByEmail`, passing relevant metadata including a role derived from the workflow step.
    *   **`src/app/api/workflows/route.ts` (POST - Create Workflow)**: If `pendingInvites` (emails) exist during workflow creation, it iterates and calls `inviteUserByEmail` for each, determining the highest role for the user if they are part of multiple steps.
    *   **`src/app/api/workflows/[id]/route.ts` (PUT - Update Workflow)**: Similar to workflow creation, if new users are added during an update, `inviteUserByEmail` is used.

*   **`supabase.auth.admin.createUser()` is primarily used in utility scripts, not runtime invitation flows**:
    *   `scripts/test-admin-api.js`: Uses `createUser` for testing.
    *   `scripts/create-user.js`: A script to manually create users with a password, also likely for testing or specific admin tasks.

*   **User Metadata in Invites**: Metadata such as `full_name`, `role`, `job_title` is passed via `options.data` in `inviteUserByEmail`. This data should be available to the user/application when they complete the invitation flow.

*   **Handling of Existing Users**:
    *   The workflow invitation route (`/api/workflows/[id]/invitations/route.ts`) proactively checks for an existing user profile in the `profiles` table *before* attempting an `inviteUserByEmail` call.
    *   The general user invite route (`/api/users/invite/route.ts`) relies on catching an error from `inviteUserByEmail` (e.g., "User with this email already exists") to determine if a user is already present.

*   **Profile Creation and Database Triggers**: The presence of SQL files like `fix-invitation-trigger-simple.sql` and various migration scripts related to user creation suggests that database triggers (likely an `on_auth_user_created` trigger on the `auth.users` table) are intended to automatically create corresponding entries in the `public.profiles` table. The correct functioning of these triggers is critical.

*   **Function `verifyEmailTemplates()`**: This function appears in several invitation-related API routes. Its purpose needs to be clarified (e.g., does it check if custom email templates exist or are valid in Supabase?).

**Immediate Observations & Areas for Deeper Investigation**:

1.  **Consistency in Checking for Existing Users**: It's generally more robust to explicitly check if a user exists (e.g., by querying `auth.users` or `public.profiles` by email) *before* calling `inviteUserByEmail`. If the user exists, the system should update their permissions. If not, then proceed with the invitation. This avoids relying solely on error messages from `inviteUserByEmail`.
2.  **Brand Admin Invitation Flow**: The initial codebase search did not highlight direct calls to `inviteUserByEmail` or `createUser` within the brand creation (`POST /api/brands`) or update (`PUT /api/brands/[id]`) API routes specifically for *new* users being added as admins. This needs a focused review.
3.  **Redirect URL (`options.redirectTo`) and Frontend Handling**: The destination URL used in `inviteUserByEmail` calls and the frontend component that handles the user landing there (e.g., for setting passwords) are critical pieces of the flow.
4.  **Database Trigger for Profile Creation**: The `on_auth_user_created` trigger (or equivalent) must reliably create an entry in `public.profiles` whenever a new user is added to `auth.users` (either by invite or direct creation).

### 3. Scenario 1: Adding Users to Workflows

**Objective**: Analyze how users (new and existing) are added to workflows and if/how the invitation process is handled for new users.

**Primary API Endpoint Reviewed**: `src/app/api/workflows/[id]/invitations/route.ts` (POST handler)

**Logic Overview**:

1.  **Input**: Accepts `workflowId` (from path), `email`, and `stepId` (from body).
2.  **Validation**: Checks if the workflow and the specified step within it exist.
3.  **Existing User Check**: Queries the `public.profiles` table using the provided `email` to see if a profile (`existingProfile`) exists. Sets `userExists = true` if found.
    *   This check is good for determining if the user has a profile in the system.
4.  **`workflow_invitations` Record Creation**: A new record is **always** inserted into the `workflow_invitations` table. This record includes:
    *   `workflow_id`, `step_id`, `email`.
    *   `role`: Taken from the `step.role` or defaults to 'editor'.
    *   `invite_token`: A newly generated UUID (`uuidv4()`).
    *   `expires_at`: Set to 7 days from creation.
    *   `status`: 'pending'.
5.  **Supabase Auth Invitation (for New Users)**:
    *   If `userExists` is `false` (based on the profile check), the system then attempts to send a Supabase authentication invite using `supabase.auth.admin.inviteUserByEmail(body.email, { data: { ... } })`.
    *   Metadata passed to `inviteUserByEmail` includes `full_name`, `job_title`, `company`, a general system `role` (derived from `step.role` as 'viewer', 'editor', or 'admin'), `invited_by` (current user ID), and `invited_from_workflow` (`workflowId`).
    *   The function `verifyEmailTemplates()` is called before this invite.
    *   An error during the `inviteUserByEmail` call is logged but explicitly stated as *non-critical* in a comment, implying the `workflow_invitations` record is primary.
6.  **Permissions for Existing Users**: If `userExists` is `true`, no explicit permission update logic (e.g., adding to a `user_workflow_permissions` table or updating an existing record for that user and workflow step) is present in this specific API endpoint beyond creating the `workflow_invitations` record.

**Assessment & Potential Issues**:

*   **Handling of Existing Users**: The current logic creates a `workflow_invitations` record for existing users but doesn't seem to directly grant them permissions or link them to the workflow step beyond this record. The system might rely on these `workflow_invitations` records to determine access, or there might be another process or endpoint that consumes these records to formalize the assignment. This needs clarification.
*   **Role Discrepancy/Purpose**: A `role` is stored in `workflow_invitations` (specific to the step) and another, more general `role` (viewer/editor/admin) is passed as metadata in the `inviteUserByEmail` call for new users. The relationship and usage of these two roles need to be understood. The metadata role likely influences the user's default state/permissions in the `profiles` table or a general permissions table upon accepting the invite.
*   **`workflow_invitations.invite_token` Usage**: The purpose of the `invite_token` generated and stored in `workflow_invitations` is unclear if Supabase's `inviteUserByEmail` (which uses its own token mechanism) is the primary way new users receive their actual invitation link. If a custom email system is using this `workflow_invitations.invite_token`, that flow needs to be identified.
*   **Error Handling for Auth Invite**: If `inviteUserByEmail` fails for a new user, a `workflow_invitations` record still exists. This could lead to an orphaned workflow-specific invitation if the user never makes it into the `auth.users` table. While noted as non-critical, this could cause confusion or require cleanup.
*   **Profile vs. Auth User**: The check for `existingProfile` in `public.profiles` is a good indicator of a user being in the system. However, the ultimate source of truth for authentication is `auth.users`. A robust check might involve looking up the user by email in `auth.users` first (e.g., using `supabase.auth.admin.getUserByEmail()`, though this is not available in client libraries, only server-side admin). If an `auth.users` record exists but a `profiles` record is missing, it indicates an issue with the profile creation trigger/process.

### 4. Scenario 2: `/users/invite` Endpoint

**Objective**: Understand the current implementation of the dedicated user invite endpoint.

**Primary API Endpoint Reviewed**: `src/app/api/users/invite/route.ts` (POST handler)

**Logic Overview**:

1.  **Authorization**: Endpoint is protected by `withAdminAuth`, meaning only global administrators can use it.
2.  **Input**: Expects `email` (required), `role` (required, validated against ['admin', 'editor', 'viewer']), and optionally `full_name`, `job_title`, `company`, and `brand_id`.
3.  **Email Template Check**: Calls `await verifyEmailTemplates()` at the beginning.
4.  **Existing User Check (Reactive)**:
    *   The system does **not** perform a proactive check (e.g., querying `auth.users` or `profiles`) for an existing user *before* attempting the invitation.
    *   It calls `supabase.auth.admin.inviteUserByEmail()` directly.
    *   If the `inviteUserByEmail` call returns an error and the error message includes "already exists", it then responds with a 409 status code indicating the user already exists or has been invited.
5.  **Supabase Auth Invitation**: If no "already exists" error (or other critical error) occurs, `inviteUserByEmail` is used. Metadata passed in `options.data` includes `full_name`, `job_title`, `company`, the validated `role`, and `invited_by` (the ID of the admin performing the action).
6.  **Optional Brand Assignment**: If `brand_id` is provided in the request and the Supabase user invitation is successful (an `inviteData.user` object is returned), an attempt is made to insert a record into the `user_brand_permissions` table, linking the new user to the specified brand with the provided `role`.
    *   If this brand assignment fails, the overall response is still success, but it includes a warning message about the failed assignment.

**Assessment & Potential Issues**:

*   **Handling of Existing Users**: The current implementation identifies existing users reactively (based on the error from `inviteUserByEmail`). The user story specifies: "If the user already exists, they just have their permissions updated." This endpoint, as it stands, does not offer a path to update an existing user's permissions. It primarily focuses on inviting new users or re-inviting (if Supabase handles that for unconfirmed users).
*   **Clarity of "Role"**: The `role` (admin, editor, viewer) is passed in the invite metadata. Its application upon invite completion (e.g., setting a default system role or a role within the `profiles` table) needs to be consistent with how roles are managed elsewhere, particularly in `src/app/api/auth/complete-invite/route.ts`.
*   **User Experience for Admin**: If an admin tries to invite an existing user, they get a "user already exists" error. It might be more helpful to inform the admin that the user exists and perhaps offer to manage their permissions directly if that's the intent.

### 5. Scenario 3: Adding Brand Admins

**Objective**: Investigate how adding a brand admin (new or existing user) is handled, particularly concerning invitations for new users.

**API Endpoints Reviewed**:
*   `src/app/api/brands/route.ts` (POST handler for new brands)
*   `src/app/api/brands/[id]/route.ts` (PUT handler for updating existing brands)

**Logic Overview (New Brand Creation - POST `src/app/api/brands/route.ts`)**:

1.  **Primary Admin (Creator)**: An RPC function `create_brand_and_set_admin` is called. This function is presumed to make the authenticated user (creator of the brand) an admin in `user_brand_permissions`.
2.  **Additional Admins**: If `body.brand_admin_ids` (an array of user IDs) is provided, the endpoint filters out the creator's ID and then attempts to `upsert` records into `user_brand_permissions` for the remaining IDs, assigning them the 'admin' role for the new brand.
3.  **Invitation of New Users**: There is **no logic** to check if the user IDs in `body.brand_admin_ids` correspond to existing users. There is **no call to `supabase.auth.admin.inviteUserByEmail()`** or any other user creation/invitation method for these additional admin IDs if they represent users not yet in the system.

**Logic Overview (Updating Existing Brand - PUT `src/app/api/brands/[id]/route.ts`)**:

1.  **Admin List Processing**: Accepts `body.brand_admin_ids` (an array of user IDs).
2.  **Permission Updates**: Fetches current admins for the brand, calculates which ones to remove and which to upsert (add or ensure they remain admin). Operations are performed on `user_brand_permissions`.
3.  **Invitation of New Users**: Similar to new brand creation, there is **no explicit logic** to detect if any ID in `body.brand_admin_ids` belongs to a non-existent user. There are **no calls to `supabase.auth.admin.inviteUserByEmail()`** for users who might be new to the system but are being designated as brand admins.

**Assessment & Potential Issues for Brand Admin Addition**:

*   **Gap for New Users**: Both when creating a new brand and when updating an existing one, if a user ID is provided for a brand admin who does not yet have an account in Supabase, that user will **not** be invited to the system. The attempt to set their permissions in `user_brand_permissions` will likely fail due to foreign key constraints (if `user_brand_permissions.user_id` references `auth.users.id` or `profiles.id`), or it will create an orphaned permission record.
*   **Expected Behavior**: The system should identify if a designated brand admin is a new user (by checking their email or a provided ID against existing users). If new, an invitation (`inviteUserByEmail`) should be sent, and then their permissions set once they are in the system (or potentially, permissions set with the expectation they will exist once the invite is accepted).

### 6. Database Schema Review (`supabase-schema.sql` & Direct DB Query)

**Objective**: Identify database structures, especially triggers or functions, involved in user creation and profile management, and review RLS policies.

**Key Findings (Confirmed by Direct Database Query)**:

*   **`on_auth_user_created` Trigger and `create_profile_for_user` Function**: 
    *   **Confirmed Existence**: The database has an active trigger `on_auth_user_created` on `auth.users` that executes `public.create_profile_for_user()` after an insert.
    *   **Function Definition**: `create_profile_for_user()` correctly inserts a new row into `public.profiles`, mapping `NEW.id` (from `auth.users`) to `profiles.id`, `NEW.email` to `profiles.email`, and populating `full_name`, `avatar_url`, `job_title`, `job_description`, and `company` from `NEW.raw_user_meta_data` (which is populated by `options.data` in `inviteUserByEmail`).
    *   **Significance**: This is a critical positive finding. The primary mechanism for automatic profile creation upon new user authentication is correctly defined in the database. The explicit `profiles` upsert in the frontend `/auth/confirm` page serves as a good redundant measure or update mechanism.

*   **Table Structures & Foreign Keys**: 
    *   `profiles.id` is the Primary Key.
    *   `user_brand_permissions.user_id` has a Foreign Key constraint referencing `profiles.id`. This confirms that a `profiles` record *must* exist for a user before any brand permissions can be assigned to them.

*   **Row-Level Security (RLS) Policies**: 
    *   **Profiles**: Users can view all profiles. They can only insert/update their own profile record (where `auth.uid() = id`). This is appropriate.
    *   **User Brand Permissions**: All users can view all `user_brand_permissions` records. Brand admins can manage (all operations) permissions for their brand. The open read policy might need review depending on data privacy requirements, but does not directly block invite functionality.
    *   **Brands, Content, Workflows**: Generally allow public/authenticated reads, with write/delete operations restricted to users with specific roles (admin/editor) within the brand context. This seems reasonable.
    *   **`workflow_invitations` RLS**: No RLS policies for `workflow_invitations` were returned by the query provided. If RLS is not enabled or is too permissive on this table, it could be a potential area to review for security/privacy, ensuring users only see invites relevant to them.

**Implications**: 
*   With the `on_auth_user_created` trigger confirmed, the primary concern for profile creation shifts to ensuring this trigger is consistently applied across all environments (dev, staging, prod) and that its definition is version-controlled (as it appears to be in `migrations/consolidated_migrations.sql`).
*   Failures in assigning permissions (like `user_brand_permissions`) are less likely due to a missing `profiles` record *if the trigger functions correctly and `raw_user_meta_data` is populated as expected during invites*. The focus shifts more towards the logic within API routes for handling new vs. existing users and the timing of permission assignments.

### 7. Invite Completion Flow (`src/app/auth/confirm/page.tsx`)

**Objective**: Understand how users complete their invitation and set up their account after clicking an invite link.

**Key Component Reviewed**: `ConfirmContent` in `src/app/auth/confirm/page.tsx`

**Logic Overview for `type='invite'`**:

1.  **Token and Type Parsing**: The component retrieves the `token` (token_hash) and `type` from URL search parameters.
2.  **Prefill User Information (`useEffect`, `getInvitationInfo`)**: 
    *   Attempts to call `supabase.auth.getUser()`.
    *   If a user session is found (which Supabase might establish after a valid invite link redirect), it prefills the form (email, full name, job title, company) using `user.email` and `user.user_metadata`. The metadata is expected to have been populated by the `options.data` from the original `inviteUserByEmail` call.
3.  **Form Submission (`handleConfirmation`)**: Requires the user to provide Full Name, Job Title, Company, and set a Password.
    *   **Token Verification**: Calls `supabase.auth.verifyOtp({ token_hash: token, type: 'invite' })` to validate the invitation token.
    *   **User Update**: If `verifyOtp` is successful, it calls `supabase.auth.updateUser({ password: password, data: { full_name, job_title, company } })`. This sets the user's password in `auth.users` and updates their `user_metadata`.
    *   **Profile Upsert**: **Crucially**, it then explicitly calls `supabase.from('profiles').upsert(...)` to create or update the user's record in the `public.profiles` table, using the ID from `verifyData.user.id` and form details. This is a very important step, especially if the automatic `on_auth_user_created` trigger is missing or unreliable.
    *   **Backend Finalization**: Makes a POST request to `/api/auth/complete-invite`. This backend endpoint is intended to perform any final server-side actions, such as applying specific permissions based on the original invitation context (e.g., assigning brand roles or system roles stored in the user's metadata during the invite).
4.  **Success/Redirect**: On success, redirects the user (defaulting to `/dashboard`).

**Assessment & Potential Issues**:

*   **Robust Invite Completion**: The client-side flow for invite completion is relatively robust due to the explicit `profiles` upsert. This mitigates potential issues from a missing or faulty `on_auth_user_created` database trigger for populating the profile.
*   **Dependency on `/api/auth/complete-invite`**: The final assignment of specific roles and permissions (e.g., making a user a brand admin as per the original intent of an invite, or setting their system-wide role) hinges on the correct implementation of the `/api/auth/complete-invite` backend endpoint. This endpoint needs to reliably read the `user.user_metadata` (set during the initial `inviteUserByEmail` call) and apply the permissions in the database.
*   **Metadata Integrity**: The entire flow relies on the `user_metadata` (passed in `options.data` during `inviteUserByEmail`) being correctly populated, persisted by Supabase, and then correctly read and acted upon by `/api/auth/complete-invite`.

### 8. Backend Invite Completion (`/api/auth/complete-invite/route.ts`)

**Objective**: Understand how the system finalizes an invitation server-side after the user has confirmed and set up their account.

**Primary API Endpoint Reviewed**: `src/app/api/auth/complete-invite/route.ts` (POST handler)

**Logic Overview**:

1.  **Authentication**: Protected by `withAuth`, so the user making the request is authenticated (having just completed the frontend confirmation steps).
2.  **Metadata Retrieval**: Accesses `user.id`, `user.email`, `user.app_metadata`, and `user.user_metadata`. It looks for `assignedRole`, `associatedBrandId`, and `associatedWorkflowId` within this metadata. These are expected to have been populated during the initial `inviteUserByEmail` call from one of the inviting API routes.
3.  **Role Validation**: Validates `assignedRole` against an enum ['admin', 'editor', 'viewer'].
4.  **Permission Assignment**: 
    *   If `associatedBrandId` is found in the metadata, it attempts to `upsert` a record into `user_brand_permissions` for the user, brand, and role.
    *   If `associatedWorkflowId` is found (and no direct `associatedBrandId`), it fetches the workflow to find its `brand_id`, then attempts to `upsert` into `user_brand_permissions` for that derived brand.
    *   If neither a direct brand ID nor a workflow leading to a brand ID is found, it logs a warning and returns success, but no specific brand permissions are assigned.
5.  **Invitation Status Update (Missing)**: There is a commented-out section indicating a TODO for updating the status of the original invitation record (e.g., in `user_invitations` or `workflow_invitations`) to 'accepted'. This is currently not implemented.

**Assessment & Potential Issues**:

*   **Core Permission Logic**: The endpoint has logic to assign brand-level permissions, which is a key part of completing an invite that has context (like being invited to a specific brand or a workflow within a brand).
*   **Dependency on Metadata**: The success of permission assignment relies entirely on the correct metadata (`role`, `invited_to_brand`, `invited_from_workflow`) being:
    *   Correctly included in the `options.data` of the initial `inviteUserByEmail` call.
    *   Persisted by Supabase into `user_metadata` or `app_metadata`.
    *   Correctly retrieved and interpreted by this `complete-invite` endpoint.
*   **Inconsistent Metadata Setting**: There might be inconsistencies in how different inviting API routes set this metadata. For instance, `src/app/api/users/invite/route.ts` directly assigns brand permissions if `brand_id` is passed, rather than just storing `invited_to_brand` in metadata for this `complete-invite` endpoint to handle. This means some permissions might be set *before* the user even accepts the invite, while others are deferred to this step.
*   **Updating Original Invitation Record**: Not updating the status of the original invitation (e.g., in `workflow_invitations`) leaves those records in a 'pending' state, which could be misleading.
*   **General System Role**: If the `assignedRole` from the metadata is intended to be a general system-wide role (beyond just brand permissions), this endpoint doesn't explicitly handle setting such a role (e.g., updating a `role` column in the `profiles` table if it were designed for that).

## Summary of Key Issues from Discovery Phase:

1.  **Profile Creation (Critical Gap)**: The `supabase-schema.sql` does not show an explicit `on_auth_user_created` trigger function, which is essential for automatically creating a `public.profiles` record when a new user is added to `auth.users`. While the frontend invite completion page (`/auth/confirm`) attempts an explicit upsert to `profiles`, relying solely on this is risky. A missing profile record will cause failures in assigning permissions due to foreign key constraints (e.g., `user_brand_permissions.user_id` references `profiles.id`).

2.  **Inconsistent Handling of New vs. Existing Users**:
    *   **Workflow Invites**: Checks for existing profiles. If new, invites. If existing, creates a `workflow_invitations` record but doesn't update permissions directly in that flow.
    *   **General User Invites (`/api/users/invite`)**: Does not proactively check for existing users; relies on `inviteUserByEmail` error. Does not update permissions for existing users.
    *   **Brand Admin Assignment (New/Edit Brands)**: Assumes user IDs provided for admins already exist. Does not invite new users if they don't exist; permission setting will fail.

3.  **Permission Assignment Logic & Timing**:
    *   Permissions are sometimes assigned at the point of invitation (e.g., `/api/users/invite` for brands) and sometimes deferred until after invite completion (via `/api/auth/complete-invite`). This inconsistency can be problematic.
    *   The `/api/auth/complete-invite` endpoint relies heavily on metadata passed during the initial `inviteUserByEmail` call. Consistency in setting and retrieving this metadata is crucial.

4.  **Metadata for `inviteUserByEmail`**: Ensure `options.data` consistently includes all necessary information (e.g., `role`, `full_name`, and any context-specific IDs like `brand_id` or `workflow_id` for the `complete-invite` endpoint to use).

5.  **Updating Invitation Status**: The status of original invitation records (e.g., in `workflow_invitations`) is not updated to 'accepted' after successful user onboarding.

This concludes the discovery phase. A remediation plan will be formulated based on these findings.

## Senior Developer Feedback & Additional Considerations (Post-Initial Discovery)

Following the initial discovery, senior developer feedback has highlighted several key areas requiring deeper consideration and will inform the remediation plan:

1.  **Security of Roles & Context in Invitation Metadata (`app_metadata` vs. `user_metadata`)**:
    *   **Concern**: Storing sensitive data like `role`, `brand_id`, or `workflow_id` in `user_metadata` (which is what `options.data` in `inviteUserByEmail` populates) makes it potentially modifiable by the user via `supabase.auth.updateUser({ data: ... })`.
    *   **Recommendation**: Trust-bound fields for permissioning should be stored in `app_metadata` (which can only be set by admin API calls) or in custom, secure server-side tables. `user_metadata` should be for user-managed profile information.

2.  **Proactive "User Exists" Checks (Server-Side)**:
    *   **Concern**: Relying on error-catching from `inviteUserByEmail` or only querying `profiles` is insufficient. The definitive check for an existing authenticated user is against `auth.users`.
    *   **Recommendation**: All server-side logic that needs to check for an existing user by email before inviting must use the Supabase Admin API (with the service role key) to query `auth.users` directly (e.g., `supabase.auth.admin.listUsers({ email: ... })`).

3.  **Transactional Consistency & Orphaned Invites**:
    *   **Concern**: If a Supabase `inviteUserByEmail` call fails *after* a related record (e.g., `workflow_invitations`) has already been inserted into the database, it results in an orphaned record.
    *   **Recommendation**: Wrap database writes and subsequent Supabase invitation calls in a way that ensures atomicity. This could involve database transactions if possible across both systems (difficult), or more practically, implementing a compensating action (cleanup logic) if the Supabase invite fails after a DB write.

4.  **Full Invitation Lifecycle Management (Expiry, Resend, Cancellation)**:
    *   **Concern**: The current system has expiry for `workflow_invitations` but lacks clear mechanisms for resending unconfirmed invites, admin cancellation of pending invites, and UI for managing these states.
    *   **Recommendation**: Plan for these lifecycle events. This may involve new API endpoints and UI features.

5.  **Invitation Token Strategy (`workflow_invitations.invite_token`)**:
    *   **Concern**: Generating a custom `invite_token` for `workflow_invitations` alongside using Supabase's own token mechanism for `inviteUserByEmail` can cause confusion.
    *   **Recommendation**: Clarify the strategy. If Supabase handles the email sending via `inviteUserByEmail`, rely on its token. If a custom email flow is intended using the `workflow_invitations.invite_token`, that must be explicitly implemented (including constructing the correct confirmation URL: `{{ .SiteURL }}/auth/confirm?token={{ YOUR_TOKEN_HASH_EQUIVALENT }}&type=invite`). If not, the custom token might be redundant.

6.  **Brand Admin Flows & New User Invitation**:
    *   **Concern**: Brand admin assignment logic currently assumes provided user IDs exist and does not invite new users.
    *   **Recommendation**: When a user (identified by email, ideally) is designated as a brand admin:
        1.  Check if the user exists (server-side, against `auth.users`).
        2.  If not, use `inviteUserByEmail`, storing necessary context (target `brand_id`, intended 'admin' role) in `app_metadata`.
        3.  Permissions should be finalized in `/api/auth/complete-invite` based on this trusted `app_metadata`.

7.  **Database Triggers & Migrations (`on_auth_user_created`)**:
    *   **Concern**: The `on_auth_user_created` trigger is critical. Its absence in source control (`supabase-schema.sql`) is a risk for environment consistency (dev vs. staging/prod).
    *   **Recommendation**: The trigger definition MUST be in source control (e.g., as a migration file). Any migration to add/fix it must be idempotent.

8.  **Error Handling & Observability**: 
    *   **Concern**: Current logging of invite errors as "non-critical" might hide significant issues.
    *   **Recommendation**: Implement robust error tracking (e.g., Sentry), metrics for invitation success/failure/expiry, and provide clear, user-friendly error messages to administrators.

9.  **Rate Limiting & Spam Protection**: 
    *   **Concern**: Potential for abuse of the invitation system.
    *   **Recommendation**: Consider measures like per-admin invite quotas, CAPTCHA on UI forms that trigger invites, or email domain allow-listing.

10. **Row-Level Security (RLS) Policies Review**:
    *   **Concern**: Ensure RLS policies for `profiles`, `user_brand_permissions`, `workflow_invitations`, etc., are correctly configured.
    *   **Recommendation**: Verify that users can only modify their own profiles, admin routes bypass RLS correctly using the service role key, and users cannot access invitation data not relevant to them.

These points will be integrated into the revised remediation plan.

## Remediation Plan for User Invitation System (Post-Discovery & Feedback)

This plan outlines the steps to address the identified issues and incorporate senior developer feedback, aiming for a robust, secure, and consistent user invitation and onboarding system.

**Overarching Principles:**

1.  **Reliable Profile Creation**: Leverage the confirmed `on_auth_user_created` trigger. Ensure it's in source control and consistently applied. The frontend `profiles` upsert is a good secondary measure.
2.  **Secure Metadata**: Use `app_metadata` for trust-bound invitation context (roles, entity IDs) set via Admin API calls. `user_metadata` for user-editable info.
3.  **Robust & Consistent User Handling**: Standardize proactive server-side checks for existing users (in `auth.users`) using the Admin API before inviting or updating.
4.  **Centralized & Secure Permission Finalization**: Consolidate final permission assignments in `/api/auth/complete-invite`, driven by secure `app_metadata`.
5.  **Transactional Integrity**: Implement measures to prevent orphaned records (e.g., `workflow_invitations`) if Supabase invites fail.
6.  **Full Lifecycle Management**: Plan for invite resend/cancellation (though full implementation might be a separate phase).
7.  **Improved Observability & Error Handling**: Enhance logging and error feedback.

--- 

**Phase 0: Preparation & Foundation**

1.  **Database Migration for `on_auth_user_created` Trigger (Feedback Point 7):**
    *   **Task**: Verify the existing `public.create_profile_for_user` function and the `on_auth_user_created` trigger (as found in `migrations/consolidated_migrations.sql` and confirmed via direct DB query). Ensure the definition is idempotent and correctly populates `public.profiles` using `NEW.raw_user_meta_data` for fields like `full_name`, `email`, `avatar_url`, `job_title`, `company`.
    *   **Action**: Confirmed that the definition in `migrations/consolidated_migrations.sql` matches the active and correct trigger definition in the database. No new migration script is immediately required for this specific trigger, assuming `consolidated_migrations.sql` is the canonical source and consistently applied. Key is to ensure `raw_user_meta_data` (from `options.data` in `inviteUserByEmail`) contains expected fields for the trigger to consume.
    *   **Status**: Verified. Source of truth is `migrations/consolidated_migrations.sql`.
    *   **Rationale**: Guarantees baseline profile creation, leveraging the confirmed existing mechanism.

2.  **Server-Side Helper: `getUserAuthByEmail` (Feedback Point 2):**
    *   **Task**: Implement `async function getUserAuthByEmail(email: string, supabaseAdmin: SupabaseClient): Promise<User | null>`.
    *   **Action**:
        *   Created migration `migrations/20240728000000_create_get_user_by_email_rpc.sql` defining `FUNCTION public.get_user_by_email(user_email TEXT) RETURNS SETOF auth.users` which queries `auth.users` by email (case-insensitive) using `SECURITY DEFINER`.
        *   Implemented the `getUserAuthByEmail` helper in `src/lib/auth/user-management.ts` to call this RPC function.
    *   **Status**: Implemented.
    *   **Location**: `src/lib/auth/user-management.ts` and `migrations/20240728000000_create_get_user_by_email_rpc.sql`.
    *   **Rationale**: Centralizes the recommended server-side method for checking if a user exists in `auth.users` by email, using a secure RPC call.

3.  **Server-Side Helper: Secure Invite with `app_metadata` (Feedback Point 1):**
    *   **Task**: Implement `async function inviteNewUserWithAppMetadata(email: string, appMetadata: object, supabaseAdmin: SupabaseClient, userMetadata?: object): Promise<{ user: User | null; error: Error | null }>`.
    *   **Action**: Implemented the `inviteNewUserWithAppMetadata` helper in `src/lib/auth/user-management.ts`. This function first calls `supabaseAdmin.auth.admin.inviteUserByEmail()` (passing any `userMetadata` to `options.data` and `redirectTo` to `/auth/confirm`). If successful, it immediately calls `supabaseAdmin.auth.admin.updateUserById()` to set the secure `appMetadata` for the newly invited user.
    *   **Status**: Implemented.
    *   **Location**: `src/lib/auth/user-management.ts`.
    *   **Rationale**: Encapsulates the secure two-step invitation process, separating user-modifiable metadata from admin-set, trust-bound application metadata for context-specific permissions.

---

**Phase 1: Core Invitation Logic - General Invite & Brand Admins (New Users)**

*Focus: Ensure new users can be invited correctly with secure metadata, and basic permissioning upon completion is set up via the centralized `/api/auth/complete-invite` endpoint.* 

1.  **Refactor `/api/users/invite/route.ts` (Feedback Point 2, 1, 6):**
    *   **Task**:
        *   Use the new `getUserAuthByEmail` helper.
        *   If user exists: Respond with "User already exists. Manual permission update required." (Full permission update for existing users via this endpoint is deferred for now).
        *   If user does not exist: Use `inviteNewUserWithAppMetadata`.
            *   `app_metadata` to include: `{ intended_role: body.role, invited_to_brand_id: body.brand_id, inviter_id: adminUser.id, invite_type: 'direct_user_invite' }`.
            *   `user_metadata` (passed to `options.data` of `inviteUserByEmail` via the helper) can include: `{ full_name: body.full_name, job_title: body.job_title, company: body.company }`.
        *   Removed the direct insertion into `user_brand_permissions` from this route; this will be handled by `/api/auth/complete-invite`.
    *   **Status**: Implemented.
    *   **Files Modified**: `src/app/api/users/invite/route.ts`.
    *   **Rationale**: Implements secure invitation for new users with context in `app_metadata` and defers permissioning to the central `complete-invite` endpoint. Clarifies handling for existing users for this phase.

2.  **Refactor Brand Admin Assignment in `/api/brands/...` (POST & PUT) (Feedback Point 6, 1, 2):**
    *   **Task (Requires UI change for email input if new users can be admins)**:
        *   When processing designated brand admins (ideally provided as emails):
            *   For each email, use `getUserAuthByEmail`.
            *   If user exists: Collect their `user.id` for immediate permission update (if this pattern is kept for existing users) or for consistency, also pass their ID to `complete-invite` with context.
            *   If user does not exist: Use `inviteNewUserWithAppMetadata`.
                *   `app_metadata`: `{ intended_role: 'admin', assigned_as_brand_admin_for_brand_id: brandIdBeingCreatedOrUpdated, inviter_id: currentAuthenticatedUser.id, invite_type: 'brand_admin_invite' }`.
                *   `user_metadata`: Minimal, e.g., `{ email_provided_for_invite: email }`.
        *   Permissions for *existing* users designated as admins can still be upserted directly in these routes. Permissions for *newly invited* admins will be handled by `complete-invite`.
    *   **Rationale**: Ensures new users identified as brand admins are properly invited with secure context stored in `app_metadata`.

3.  **Refactor `/api/auth/complete-invite/route.ts` (Initial Pass - Feedback Point 1, 6):**
    *   **Task**:
        *   Modify to retrieve context *exclusively* from `user.app_metadata` (e.g., `intended_role`, `invited_to_brand_id`, `