# MixerAI 2.0 Invitation System: Administrator's Guide

This guide provides instructions for administrators on how to effectively use the MixerAI 2.0 invitation system to invite and manage users.

## Overview

The MixerAI 2.0 invitation system allows administrators to:

1. Invite new users to the platform
2. Assign specific roles (admin, editor, viewer)
3. Optionally associate users with specific brands
4. Monitor invitation status

## User Roles

MixerAI 2.0 supports three user roles:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features, can invite users, manage brands, and access all content |
| **Editor** | Can create and edit content for assigned brands, cannot invite users or create brands |
| **Viewer** | Read-only access to content for assigned brands, cannot make changes |

## Inviting Users

### Prerequisites

- You must have administrator privileges
- The email address for the user you wish to invite
- Knowledge of which role and brand access they need

### Invitation Process

1. **Access the Invitation Form**
   - Log in to MixerAI 2.0 at https://mixerai.orangejely.co.uk
   - Navigate to Users section from the main dashboard
   - Click "Invite User" button

2. **Complete the Invitation Form**
   - **Email Address**: Enter the recipient's email (required)
   - **Full Name**: Enter the user's name (optional, but recommended)
   - **Role**: Select appropriate role from dropdown (admin, editor, viewer)
   - **Brand**: Optionally select a brand to grant immediate access

3. **Send the Invitation**
   - Click "Send Invitation" button
   - A success message will appear if the invitation was sent successfully

### What Happens Next

After sending an invitation:

1. The invited user receives an email with the subject "You've Been Invited to MixerAI 2.0 - General Mills' AI Content Platform"
2. The email contains information about MixerAI 2.0 and an "Accept Invitation" button
3. When clicked, the user is directed to set up their account with a password
4. Once completed, they can immediately access MixerAI 2.0 with the assigned role and brand permissions
5. The invitation link expires after 7 days

## Managing Brand Permissions

### Assigning Users to Brands

You can assign users to brands either during invitation or after they've created their account:

**During Invitation:**
- Select the brand from the dropdown in the invitation form
- The user will automatically have access to this brand upon account creation

**After Account Creation:**
1. Navigate to the Users section
2. Find the user and click on their name
3. In the user details, go to the "Brand Permissions" tab
4. Click "Add Brand Permission"
5. Select the brand and role for this specific brand
6. Save the changes

### Changing User Roles

To modify a user's role:

1. Navigate to the Users section
2. Find the user and click on their name
3. To change their global role, use the "Role" dropdown in their profile
4. To change brand-specific roles, go to the "Brand Permissions" tab and edit individual permissions
5. Save changes

## Troubleshooting Invitations

### Common Issues and Solutions

**User Reports Not Receiving Invitation Email:**
1. Check if the email address was entered correctly
2. Ask the user to check their spam/junk folder
3. If necessary, you can resend the invitation

**Invitation Link Has Expired:**
1. The invitation link expires after 7 days
2. Send a new invitation if the user was unable to complete registration in time

**User Already Exists Error:**
- If you receive this error, the email address may already be registered
- The user should try logging in with their existing credentials
- If they've forgotten their password, they can use the password reset function

**User Has Wrong Permissions:**
1. Navigate to the Users section
2. Find the user and click on their name
3. Verify and adjust their role and brand permissions as needed

## Best Practices

### Effective User Management

1. **Use Descriptive Names**: Encourage users to use their full names for better identification in the system.

2. **Role Assignment**: Assign the most restrictive role that still allows users to perform their necessary tasks.

3. **Brand-Specific Permissions**: Use brand-specific permissions to create separation between different brands and their content.

4. **Regular Audits**: Periodically review user accounts and permissions to ensure they're up to date.

5. **Timely Invitations**: Let users know when to expect an invitation so they can check their email.

### Security Considerations

1. **Admin Access**: Limit the number of users with administrator privileges.

2. **Invitation Expiry**: Remind users that invitation links expire after 7 days for security purposes.

3. **Secure Passwords**: Encourage users to create strong, unique passwords.

## Contact and Support

If you encounter issues with the invitation system:

1. Contact Peter Pitcher via Microsoft Teams or email at peter.pitcher@generalmills.com
2. Provide specific details about the issue, including any error messages
3. Include the email address of the user you're trying to invite

## Appendix: Email Template Preview

When users are invited, they will receive an email that looks like this:

```
Subject: You've Been Invited to MixerAI 2.0 - General Mills' AI Content Platform

Hello,

You've been invited to join MixerAI 2.0, General Mills' intelligent content creation 
platform that helps marketing teams create on-brand content at scale.

Your role: [Role displayed here]

MixerAI 2.0 allows you to:
- Generate brand-compliant marketing content
- Streamline approval workflows
- Maintain consistency across campaigns

[Accept Invitation Button]

This invitation will expire in 7 days.

Need help? Contact Peter Pitcher via Microsoft Teams or email at 
peter.pitcher@generalmills.com.

If you didn't expect this invitation, you can safely ignore this email.

© 2023 MixerAI 2.0 | General Mills
``` 