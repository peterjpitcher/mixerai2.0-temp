# MixerAI 2.0 Invitation System Testing Plan

This document outlines a comprehensive testing plan for validating the MixerAI 2.0 invitation system on the production environment (`mixerai.orangejely.co.uk`).

## Prerequisites

Before beginning testing, ensure:

1. Supabase project is properly configured with:
   - Site URL set to `https://mixerai.orangejely.co.uk`
   - Redirect URLs include:
     - `https://mixerai.orangejely.co.uk/auth/callback`
     - `https://mixerai.orangejely.co.uk/api/auth/callback`
   - Email templates are updated with those in the `emails/` directory
   - Subject lines are properly configured

2. MixerAI application is deployed to production with all environment variables set correctly:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. An administrator account is already set up and can access the system.

## Test Cases

### A. Basic Invitation Flow

#### Test A1: Admin User Invitation

1. **Setup:**
   - Log in to MixerAI as an administrator
   - Navigate to the user invitation page

2. **Test Steps:**
   - Enter a valid email address (use a real email you can access)
   - Enter a name (e.g., "Test Admin")
   - Select "Admin" as the role
   - Do not select a brand
   - Submit the invitation

3. **Expected Results:**
   - Success message appears
   - Invitation email is received
   - Email contains correct branding and information about MixerAI being a General Mills tool
   - Email mentions Peter Pitcher as the contact person
   - Invitation link contains the production domain

4. **Validation:**
   - Open the email and click the invitation link
   - Complete the sign-up process
   - Verify you can log in with the new account
   - Verify admin privileges are granted

#### Test A2: Editor User Invitation with Brand

1. **Setup:**
   - Log in to MixerAI as an administrator
   - Navigate to the user invitation page

2. **Test Steps:**
   - Enter a valid email address (different from Test A1)
   - Enter a name (e.g., "Test Editor")
   - Select "Editor" as the role
   - Select a specific brand
   - Submit the invitation

3. **Expected Results:**
   - Success message appears
   - Invitation email is received
   - Email displays the correct role

4. **Validation:**
   - Open the email and click the invitation link
   - Complete the sign-up process
   - Verify the new user has editor access only to the specified brand

#### Test A3: Viewer User Invitation

1. **Setup:**
   - Log in to MixerAI as an administrator
   - Navigate to the user invitation page

2. **Test Steps:**
   - Enter a valid email address (different from previous tests)
   - Enter a name (e.g., "Test Viewer")
   - Select "Viewer" as the role
   - Submit the invitation

3. **Expected Results:**
   - Success message appears
   - Invitation email is received

4. **Validation:**
   - Open the email and click the invitation link
   - Complete the sign-up process
   - Verify the new user has viewer-only permissions

### B. Email Delivery Tests

#### Test B1: Different Email Providers

1. **Test Steps:**
   - Send invitations to email addresses from different providers:
     - Gmail
     - Outlook/Microsoft
     - Yahoo
     - Corporate email (General Mills)

2. **Expected Results:**
   - All invitation emails are received
   - Emails appear correctly formatted in each email client

#### Test B2: Email Content Validation

1. **Test Steps:**
   - Examine invitation emails across different devices:
     - Desktop email client
     - Mobile email client
     - Web-based email

2. **Expected Results:**
   - Email renders correctly on all devices
   - Buttons and links are properly formatted and clickable
   - General Mills branding is clearly visible

### C. Edge Cases

#### Test C1: Inviting Existing User

1. **Test Steps:**
   - Attempt to invite an email address that already has an account

2. **Expected Results:**
   - System provides appropriate error message
   - No invitation is sent

#### Test C2: Invitation Expiration

1. **Test Steps:**
   - Send an invitation but do not accept it
   - Wait for the invitation to expire (7 days)
   - Try to use the expired invitation link

2. **Expected Results:**
   - System displays appropriate expiration message
   - User cannot create account with expired link

#### Test C3: Simultaneous Invitations

1. **Test Steps:**
   - Send invitations to multiple users in quick succession

2. **Expected Results:**
   - All invitations are processed correctly
   - Each user receives their individual invitation

#### Test C4: Non-Admin Invitation Attempt

1. **Test Steps:**
   - Log in as a non-admin user
   - Attempt to access the invite user page
   - Use API tools to attempt to send an invitation directly

2. **Expected Results:**
   - Non-admin user cannot access invitation page
   - API rejects the request with appropriate permission error

### D. Brand Permission Tests

#### Test D1: Multi-Brand Permission

1. **Test Steps:**
   - Create a new test user through invitation
   - As an admin, assign this user to multiple brands with different roles

2. **Expected Results:**
   - User can access all assigned brands
   - Different permission levels are correctly applied to each brand

#### Test D2: Brand Assignment During Invitation

1. **Test Steps:**
   - Invite a new user and assign them to a specific brand during invitation

2. **Expected Results:**
   - After account creation, user should immediately have access to the assigned brand
   - Database should show correct record in user_brand_permissions table

### E. Authentication Callback Tests

#### Test E1: Authentication Redirect

1. **Test Steps:**
   - Click an invitation link
   - Complete the authentication process
   - Observe the redirect behavior

2. **Expected Results:**
   - User is properly redirected to the dashboard after completing authentication
   - No error messages appear during the process

#### Test E2: Multiple Device Access

1. **Test Steps:**
   - Receive invitation email on mobile device
   - Click invitation link on mobile
   - Complete sign-up on mobile
   - Later, attempt to log in on desktop

2. **Expected Results:**
   - Authentication works seamlessly across devices
   - Session is maintained appropriately

## Post-Testing Actions

After completing all tests:

1. **Document Results:**
   - Record any issues or unexpected behavior
   - Note successful test cases

2. **Issues Resolution:**
   - Prioritize and address any issues found during testing
   - Re-test any fixed issues

3. **Final Validation:**
   - Perform one final end-to-end test of the invitation system
   - Verify all components work together correctly

## Rollback Plan

If critical issues are discovered during testing:

1. **Temporary Mitigation:**
   - Disable invitation system if necessary
   - Prepare manual account creation process as fallback

2. **Communication:**
   - Inform stakeholders of any issues and expected resolution timeline

3. **Fixes Implementation:**
   - Address identified issues
   - Deploy fixes using the established deployment process
   - Re-test to verify resolution

## Testing Schedule

This testing plan should be executed in the following order:

1. Basic invitation flow tests (A1-A3)
2. Email delivery tests (B1-B2)
3. Edge cases (C1-C4)
4. Brand permission tests (D1-D2)
5. Authentication callback tests (E1-E2)

Allocate at least 2-3 days for complete testing, with additional time for issue resolution if needed. 