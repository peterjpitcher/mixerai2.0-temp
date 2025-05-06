# MixerAI 2.0 Invitation System Review

This document provides a comprehensive review of the invitation system in MixerAI 2.0, covering the entire workflow from invitation to user onboarding, along with recommendations for production deployment.

## 1. Invitation System Components

The invitation system consists of several interconnected components:

### 1.1 Frontend Components

- **Invitation Form** (`src/app/users/invite/page.tsx`): A user interface for administrators to invite new users, including fields for:
  - Email address (required)
  - Full name (optional)
  - Role selection (admin, editor, viewer)
  - Brand assignment (optional)
  
### 1.2 Backend Components

- **Invitation API** (`src/app/api/users/invite/route.ts`): Processes invitation requests with features including:
  - Permission validation (only admins can invite users)
  - Email validation
  - Role validation
  - Integration with Supabase Auth for sending invitations
  - Optional brand permission assignment

### 1.3 Email Templates

- **Invitation Email** (`emails/invite-user.html`): Customized HTML email template that includes:
  - MixerAI branding with General Mills information
  - Role information for the invited user
  - Clear call-to-action button
  - Expiration information (7 days)
  - Contact information for support

### 1.4 Database Structure

The system uses several database tables:

- **Profiles**: Stores user profile information
- **User Brand Permissions**: Establishes relationships between users and brands with specific roles

## 2. Invitation Workflow

### 2.1 Sending Invitations

1. An administrator navigates to the invitation form
2. They enter the new user's email and select appropriate role/brand
3. The system validates the input
4. The API checks if the current user has admin permissions
5. If authorized, Supabase sends an invitation email with a unique token
6. If a brand is selected, the system creates a brand permission record
7. A success message is displayed and the admin is redirected

### 2.2 Invitation Acceptance

1. The invited user receives an email with an invitation link
2. The link contains a secure token that expires after 7 days
3. When clicked, the link directs the user to create a password
4. After setting a password, the user is signed in automatically
5. The user has access to assigned brands based on their role

## 3. Technical Implementation Details

### 3.1 Supabase Authentication

The system uses Supabase Auth for invitation handling:

```typescript
// From src/app/api/users/invite/route.ts
const { data, error } = await supabase.auth.admin.inviteUserByEmail(body.email, {
  data: {
    full_name: body.full_name || '',
    role: body.role.toLowerCase(),
    invited_by: user.id // Track who sent the invitation
  }
});
```

### 3.2 Brand Assignment Logic

When inviting a user with a specific brand assignment:

```typescript
// From src/app/api/users/invite/route.ts
if (body.brand_id && data.user) {
  // Insert a record in the user_brand_permissions table
  const { error: permissionError } = await supabase
    .from('user_brand_permissions')
    .insert([
      {
        user_id: data.user.id,
        brand_id: body.brand_id,
        role: body.role.toLowerCase(),
        assigned_by: user.id // Track who assigned the permission
      }
    ]);
}
```

### 3.3 Email Template Variables

The invitation email template uses Supabase variables:

- `{{ .SiteURL }}`: The configured site URL from Supabase settings
- `{{ .TokenHash }}`: The unique invitation token
- `{{ .UserMetadata.role }}`: The assigned role for the invited user

## 4. Production Deployment Considerations

### 4.1 Critical Configuration Settings

For the invitation system to work correctly in production:

#### 4.1.1 Supabase Configuration

1. **Site URL**: Must be set to `https://mixerai.orangejely.co.uk` in Supabase Auth settings
2. **Redirect URLs**: Must include:
   - `https://mixerai.orangejely.co.uk/auth/callback`
   - `https://mixerai.orangejely.co.uk/api/auth/callback`

#### 4.1.2 Email Templates

1. All email templates must be uploaded to Supabase Auth Email Templates section
2. Subject lines should be configured as documented in `docs/email-templates-guide.md`

#### 4.1.3 Environment Variables

1. The following environment variables must be correctly set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 4.2 Authentication Callback Handling

Based on review, MixerAI relies on Supabase's default authentication flow:

1. Supabase redirects the user to the site URL configured in Supabase settings
2. The application appears to handle the auth callback through browser-side Supabase client

**Note**: There's no explicit `/auth/callback` or `/auth/confirm` route in the codebase. This is a **potential issue** if not properly tested, as custom handling of the authentication callback might be necessary.

## 5. Security Considerations

### 5.1 Permission Checks

- ✅ The system verifies admin permissions before allowing invitations
- ✅ Role validation prevents assigning invalid roles
- ✅ The admin client is protected from client-side use

### 5.2 Token Security

- ✅ Invitation tokens are handled by Supabase and expire after 7 days
- ✅ The system uses HTTPS for all communications

## 6. Testing Recommendations

Before production deployment, thoroughly test the following:

### 6.1 Functional Testing

- [ ] Send invitation to various email providers (Gmail, Outlook, etc.)
- [ ] Verify that invitation emails arrive with correct branding
- [ ] Confirm that invitation links work with the production domain
- [ ] Test brand assignment functionality
- [ ] Verify that users receive appropriate access based on their role

### 6.2 Edge Cases

- [ ] Test inviting users with pre-existing accounts
- [ ] Test invitations with various roles
- [ ] Verify behavior when invitation expires
- [ ] Test simultaneous invitations to multiple users

## 7. Potential Issues and Recommendations

### 7.1 Identified Issues

1. **Missing Auth Callback Routes**: There's no explicit `/auth/callback` or `/auth/confirm` route in the codebase, which may cause issues with the invitation link handling.

2. **Email Template Variables**: The email templates use `{{ .TokenHash }}` and `{{ .Token }}` variables which must be correct for the Supabase version being used.

3. **Email Deliverability**: No monitoring or fallback for email delivery issues.

### 7.2 Recommendations

1. **Create Auth Callback Routes**: Implement explicit callback handling routes for the different authentication scenarios:
   ```
   /auth/callback
   /auth/confirm
   ```

2. **Email Template Testing**: Test all email templates with actual Supabase invitations in a staging environment before production deployment.

3. **Monitoring**: Implement logging and monitoring for invitation success/failure rates.

4. **Fallback Mechanism**: Create an alternative method for administrators to manually create accounts if email invitations fail.

5. **User Guidance**: Create clear documentation for administrators on how to invite users and troubleshoot common issues.

## 8. Production Launch Checklist

Before launching the invitation system in production:

- [ ] Configure Supabase Site URL to production domain
- [ ] Update all email templates in Supabase
- [ ] Test complete invitation flow in production environment
- [ ] Verify brand assignment functionality
- [ ] Create administrator documentation
- [ ] Set up monitoring for invitation success/failure
- [ ] Test with various email providers and devices
- [ ] Implement any missing authentication callback routes

## 9. Conclusion

The MixerAI 2.0 invitation system is generally well-designed, with appropriate security checks and integration with Supabase Auth. The main concerns are around the auth callback handling and ensuring email templates use the correct variables.

By addressing the recommendations in this document, especially testing the invitation flow end-to-end with the production domain, the system should function reliably in the production environment. 