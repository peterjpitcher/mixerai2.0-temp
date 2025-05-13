# Authentication and User Management in MixerAI 2.0

This document outlines the authentication mechanisms, user management features, and related data structures in MixerAI 2.0.

## Core Authentication Strategy

MixerAI 2.0 uses **Supabase Auth** for all user authentication processes. This provides a robust and secure foundation for managing user identities and access control.

Key aspects of the authentication strategy include:

-   **Supabase Auth Helpers**: Utilises `@supabase/auth-helpers-nextjs` for seamless integration with the Next.js framework, enabling server-side, client-side, and middleware authentication capabilities.
-   **Next.js Middleware**: Implements route protection to ensure that only authenticated users can access protected areas of the application. It also handles automatic session refresh. Unauthenticated users attempting to access protected routes are redirected to the login page.
-   **Secure Cookie-Based Authentication**: Employs HttpOnly cookies for storing authentication tokens securely, preventing client-side JavaScript access and mitigating XSS risks. No tokens are stored in `localStorage` or `sessionStorage`.
-   **API Route Protection**: All sensitive API routes are protected using consistent authentication wrappers. These wrappers verify JWTs through Supabase to ensure that only authenticated and authorized users can access API resources.

## User Authentication Integration (Details from "UI and Authentication Updates")

-   The users API route (`/api/users`) connects directly to Supabase authentication data.
-   Integration with the Supabase Auth Admin API allows fetching real user data.
-   Authentication user data is merged with profile information from the `profiles` table.
-   The user data structure is enhanced to include:
    -   User metadata from Supabase Auth.
    -   Last sign-in timestamp.
    -   Role information derived from `user_brand_permissions`.
    -   Fallback avatar generation for users without profile images.

### API Route Update (`/api/users`)

The `/api/users` route now:

1.  Fetches all users from the Supabase Auth Admin API.
2.  Retrieves associated profile data from the `profiles` table.
3.  Merges this data to provide comprehensive user information.
4.  Determines the highest role for each user based on their permissions in `user_brand_permissions`.

### User Data Structure

The combined user data available through the API typically follows this structure:

```typescript
{
  id: string, // Unique user ID from Supabase Auth
  full_name: string,
  email: string,
  avatar_url: string, // URL to user's profile picture
  role: string, // Highest role across assigned brands (e.g., 'admin', 'editor', 'viewer')
  created_at: string, // Account creation timestamp
  last_sign_in_at: string, // Last sign-in timestamp from Supabase Auth
  brand_permissions: Array<{ // Detailed permissions per brand
    id: string, // Permission record ID
    brand_id: string,
    role: 'admin' | 'editor' | 'viewer'
  }>
}
```

### Requirements for User Data Fetching

-   The `SUPABASE_SERVICE_ROLE_KEY` must be correctly set in the environment variables.
-   The service role used by the application needs `auth.admin.listUsers` permission in Supabase to fetch all user details.

## Authentication Implementation Updates (Detailed)

### Completed Work

1.  **API Route Protection**:
    -   Implemented `withAuth` and `withAuthAndMonitoring` wrappers for API routes (found in `src/lib/auth/api-auth.ts`).
        -   `withAuth`: Basic protection ensuring the user is authenticated.
        -   `withAuthAndMonitoring`: Adds timing and logging, typically for resource-intensive operations.
    -   Migrated key API routes to use these wrappers, including those for brands, content, content-types, workflows, and users.
    -   Authenticated user information is included in API responses where appropriate.

2.  **Database Security (Row Level Security - RLS)**:
    -   RLS policies are defined (e.g., in `migrations/auth-rls-policies.sql`).
    -   Deployment scripts (e.g., `scripts/deploy-rls-policies.sh`) are used for applying these policies.
    -   Test scripts (e.g., `scripts/test-rls-policies.sh`) help verify RLS.
    -   Examples of RLS policies:
        -   Brand editing limited to users with 'admin' or 'editor' roles for that specific brand.
        -   Content visibility filtered by brand permissions.
        -   Profile updates limited to the profile owner.
        -   Permissions management limited to system admins.

3.  **User Permission Checks**:
    -   Role-based permission checks are implemented for sensitive operations.
    -   The user invite API, for instance, checks for admin privileges before allowing an invitation to be sent.
    -   The system tracks who invited users and assigned their initial permissions.

### Technical Implementation Details

1.  **Authentication Middleware (`src/middleware.ts`)**:
    -   Checks for user authentication on protected routes (e.g., `/dashboard/*`).
    -   Redirects unauthenticated requests for dashboard pages to the login page (`/auth/login`).
    -   Returns 401 (Unauthorized) responses for unauthenticated requests to API routes (`/api/*`).

2.  **Server Component Utilities (`src/lib/auth/server.ts`)**:
    -   `requireAuth`: A utility for server components to enforce authentication, redirecting if the user is not logged in.
    -   `getCurrentUser`: A utility to retrieve the current authenticated user's details within server components.

### Root Page Redirect (Authentication-Aware)

-   The root path (`/`) redirects users based on their authentication status:
    -   Authenticated users are sent to `/dashboard`.
    -   Unauthenticated users are sent to `/auth/login`.
-   This is implemented using server-side authentication checks with Supabase and Next.js App Router's `redirect` function.

## User Profile & Related Fields

### User Profile Fields Table

| Field Name      | Description                             | Required | Location                          |
|-----------------|-----------------------------------------|----------|-----------------------------------|
| id              | Unique identifier                       | Yes      | `auth.users`, `profiles`          |
| email           | User's email address                    | Yes      | `auth.users`, `profiles`          |
| full_name       | User's full name                        | Yes      | `auth.users` (metadata), `profiles` |
| job_title       | User's job title or role                | Yes      | `auth.users` (metadata), `profiles` |
| job_description | Description of user's job               | No       | `auth.users` (metadata), `profiles` |
| company         | User's company or organization          | Yes      | `auth.users` (metadata), `profiles` |
| avatar_url      | URL to user's profile picture           | No       | `profiles`                        |
| role            | System role (admin, editor, viewer)     | Yes      | `user_brand_permissions`          |
| created_at      | Account creation timestamp              | Yes      | `auth.users`, `profiles`          |

### Company Field

-   This field tracks the user's organizational affiliation.
-   Displayed in the users management table.
-   Required during user signup or when an invited user accepts their invitation.
-   Can be automatically pre-filled by deriving the company name from the user's email address domain (excluding TLD).
-   Editable by administrators through the user edit interface.
-   Stored in both Supabase Auth user metadata (`auth.users.raw_user_meta_data`) and the `profiles` table for broader accessibility.

## User Invitation System

MixerAI 2.0 employs a robust user invitation system built on Supabase Auth, designed to securely onboard new users and integrate them into relevant brands and workflows.

### Core Invitation Flow & Principles:

1.  **Initiation & User Check**: When an invitation is triggered (e.g., from general user invites, brand admin assignment, or workflow assignments):
    *   A server-side check is performed (using a helper like `getUserAuthByEmail` which calls a secure RPC to query `auth.users`) to determine if the user already exists in Supabase Auth.
    *   If the user exists, the system should ideally proceed to update their permissions or assignments as appropriate for the context (though some existing-user update flows might be handled differently or deferred).
    *   If the user does not exist, the invitation process for a new user begins.

2.  **Secure Invitation for New Users**:
    *   New users are invited using a server-side helper function (`inviteNewUserWithAppMetadata` which wraps `supabase.auth.admin.inviteUserByEmail()`).
    *   **`user_metadata` (Public/User-Modifiable)**: Information like `full_name`, `job_title`, `company` (provided during the invite initiation) is passed via `options.data` in the `inviteUserByEmail` call. This populates `raw_user_meta_data` in `auth.users` and is accessible by the user.
    *   **`app_metadata` (Secure/Admin-Only)**: Critical contextual information for permissioning (e.g., `intended_role`, `invited_to_brand_id`, `inviter_id`, `invite_type`) is securely set on the invited user's record using `supabase.auth.admin.updateUserById()` immediately after the `inviteUserByEmail` call. This metadata is not directly modifiable by the user.
    *   The invitation email directs the user to a confirmation URL (e.g., `/auth/confirm`).

3.  **Profile Creation (`on_auth_user_created` Trigger)**:
    *   A database trigger (`on_auth_user_created`) on the `auth.users` table automatically executes the `public.create_profile_for_user()` function upon successful creation of a new user in `auth.users`.
    *   This function populates a new record in the `public.profiles` table, mapping `id`, `email`, and relevant fields from `raw_user_meta_data` (like `full_name`, `job_title`, `company`). This ensures a profile exists for permissioning.

4.  **Invite Completion - Frontend (`/auth/confirm` page)**:
    *   When the user clicks the invitation link, they land on the confirmation page.
    *   The page verifies the invitation token (`supabase.auth.verifyOtp({ type: 'invite' })`).
    *   The user sets their password and confirms/updates profile details (full name, job title, company), which are prefilled from `user_metadata`.
    *   On submission, `supabase.auth.updateUser()` is called to set the password and update `user_metadata`.
    *   The frontend also performs an explicit `upsert` to the `public.profiles` table as a secondary measure.
    *   Finally, a POST request is made to `/api/auth/complete-invite` to finalize server-side actions.

5.  **Invite Completion - Backend (`/api/auth/complete-invite` route)**:
    *   This authenticated endpoint retrieves the user's secure `app_metadata`.
    *   Based on context stored in `app_metadata` (e.g., `intended_role`, `invited_to_brand_id`), it assigns the necessary permissions, such as creating records in `user_brand_permissions`.
    *   It should also ideally update the status of any original invitation records (e.g., in `workflow_invitations`) to 'accepted', though this part might still be a TODO.

### Key Features
- Allows existing users (typically admins or managers) to invite new users to the platform.
- Invitations are sent via email.
- Invited users complete their registration through a unique invitation link.
- Roles and brand access can potentially be pre-assigned during the invitation process.

### User Invitation System Enhancements

-   **Enhanced Error Handling in `inviteNewUserWithAppMetadata`**:
    -   The function `inviteNewUserWithAppMetadata` (likely a custom server-side function interacting with Supabase Auth) has been improved to handle failures during the `app_metadata` update more robustly.
    -   If updating the invited user's `app_metadata` (e.g., to set initial roles or company info) fails after the user has been created in Supabase Auth, the system attempts to delete the newly created user. This is a security measure to prevent users from existing in an incompletely configured state.
    -   If this cleanup deletion also fails, the error is logged comprehensively for manual review, and a critical error message is returned.
-   **Testing Setup**:
    -   Jest is configured as the testing framework.
    -   Test cases have been written for `inviteNewUserWithAppMetadata` to verify:
        1.  Successful invitation and `app_metadata` update.
        2.  Correct handling of metadata update failures, including the subsequent user deletion attempt.

## Future Steps / Areas for Review (from previous documentation)

1.  **Complete Client Updates**:
    -   Ensure no remaining `localStorage`/`sessionStorage` token storage. (This should be covered by the move to HttpOnly cookies).
    -   Update any client-side authentication context providers to align with the cookie-based flow.
2.  **RLS Policy Deployment & Testing**:
    -   Regularly ensure RLS policies are deployed to the database.
    -   Run test scripts to verify RLS is functioning as expected.
3.  **Security Review**:
    -   Conduct thorough periodic reviews of authentication flows.
    -   Verify secure cookie settings (HttpOnly, Secure, SameSite, Path).
    -   Ensure CSRF protection mechanisms are in place and effective.
4.  **Documentation**:
    -   Keep this document and related RLS policy documentation up-to-date.
5.  **Testing**:
    -   Continuously test all API routes with and without authentication.
    -   Verify proper error handling for various authentication failures.
    -   Test session refresh functionality.

This consolidated approach, leveraging Supabase's robust authentication and RLS features, significantly enhances the application's security posture and user management capabilities.

## Email Template Configuration for Supabase Auth

MixerAI 2.0 utilizes custom HTML email templates for Supabase Authentication to ensure consistent branding and user experience.

### Available Templates & Location

The source HTML files for these templates are located in the `/docs/email-templates/` directory:

-   **Invitation Email**: `invitation.html` (Sent when inviting new users)
-   **Confirm Signup**: `confirm-signup.html` (Sent for new user email verification)
-   **Reset Password**: `reset-password.html` (Sent for password reset requests)
-   **Magic Link**: `magic-link.html` (Sent for passwordless login)

### How to Use These Templates in Supabase

1.  Log in to your [Supabase Dashboard](https://app.supabase.com/).
2.  Select your project.
3.  Navigate to **Authentication > Email Templates**.
4.  For each template type (Invite, Confirm signup, Reset password, Magic Link):
    *   Click **Edit**.
    *   Copy the HTML content from the corresponding local template file (from `/docs/email-templates/`).
    *   Paste it into the HTML section in the Supabase dashboard.
    *   Click **Save**.

### Template Variables

Supabase uses the following Liquid-style variables in email templates, which are automatically replaced:

-   `{{ .SiteURL }}`: The site URL configured in your Supabase Auth settings.
-   `{{ .ConfirmationToken }}`: The unique token for email confirmation or password reset.
-   `{{ .Email }}`: The recipient's email address.
-   (Other variables like `{{ .Token }}` for magic links might also be used by Supabase depending on the template type).

### Important Notes & Configuration

1.  **Site URL Configuration**: Ensure your Site URL is correctly set in Supabase Authentication settings (e.g., `https://mixerai.orangejely.co.uk` or your production/development URL).
2.  **Testing**: After updating templates in Supabase, always send test emails to verify they render correctly in various email clients.
3.  **Email Delivery**: Supabase uses a reliable email delivery service. Advise users to check spam/junk folders if they don't receive expected emails.
4.  **Branding**: The provided templates use MixerAI branding (e.g., primary blue color `#13599f`).

### Customizing Templates

If you need to modify these local HTML templates:

1.  Ensure you maintain the Supabase template variables (e.g., `{{ .ConfirmationToken }}`).
2.  Test thoroughly after making changes by uploading the modified template to Supabase and sending test emails.
3.  Aim to keep the design responsive for various email clients.

### Email Client Compatibility

These templates are designed for broad compatibility with modern email clients like Gmail, Outlook, Apple Mail, etc.

### Troubleshooting Email Issues

If users report not receiving emails:

1.  Check your Supabase project dashboard for any email sending errors or logs.
2.  Verify the custom email templates are correctly installed and saved in the Supabase dashboard.
3.  Ensure your Supabase project has email sending enabled (it usually is by default).
4.  Advise the user to check their spam/junk folder. 