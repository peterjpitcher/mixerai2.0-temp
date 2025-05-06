# MixerAI 2.0 Email Templates Guide

This guide contains information about the email templates used for MixerAI 2.0, including recommended subject lines and important implementation details.

## Email Templates Summary

| Email Type | Template File | Subject Line | Expiration |
|------------|---------------|--------------|------------|
| Invitation | emails/invite-user.html | You've Been Invited to MixerAI 2.0 - General Mills' AI Content Platform | 7 days |
| Signup Confirmation | emails/confirm-signup.html | Confirm Your MixerAI 2.0 Account - General Mills | 24 hours |
| Password Reset | emails/reset-password.html | Reset Your MixerAI 2.0 Password - General Mills | 60 minutes |
| Magic Link | emails/magic-link.html | Sign In to MixerAI 2.0 - General Mills | 60 minutes |

## Template Variables

All templates use the following Supabase variables:

- `{{ .SiteURL }}` - The site URL configured in your Supabase settings (should be `https://mixerai.orangejely.co.uk`)
- `{{ .Token }}` or `{{ .TokenHash }}` or `{{ .ConfirmationToken }}` - The unique token for authentication
- `{{ .Email }}` - The recipient's email address
- `{{ .UserMetadata.role }}` - The role assigned to the user (only for invitation emails)

## Subject Lines

When configuring these templates in Supabase, use the subject lines from the table above to maintain consistency. These subject lines:

1. Clearly identify the application (MixerAI 2.0)
2. Indicate the purpose of the email
3. Include "General Mills" for context

## Contact Information

All templates include the following contact information:

**Contact:** Peter Pitcher  
**Contact Methods:** Microsoft Teams or email  
**Email Address:** peter.pitcher@generalmills.com

## Application Description

The templates describe MixerAI 2.0 as:

"General Mills' AI-powered content creation platform that helps marketing teams create on-brand content at scale."

Key features highlighted:
- Generate brand-compliant marketing content
- Streamline approval workflows
- Maintain consistency across campaigns

## Implementing in Supabase

To set up these email templates in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Email Templates
3. For each template type:
   - Click "Edit"
   - Set the subject line as specified in the table above
   - Copy the HTML from the corresponding template file
   - Paste it into the HTML editor
   - Click "Save Changes"

## Testing

After implementing these templates, you should test each email type:

1. **Invitation Email**: Invite a test user to your application
2. **Signup Confirmation**: Create a new account
3. **Password Reset**: Request a password reset for an existing account
4. **Magic Link**: Use the "Sign in with magic link" feature if enabled

Verify that all emails:
- Display correctly in various email clients
- Contain the correct branding and messaging
- Have functioning links that direct to the correct domain
- Include the proper contact information

## Updating Templates

If you need to update these templates in the future:

1. Make the changes to the HTML files in the `emails/` directory
2. Update this documentation if there are significant changes
3. Re-upload the updated templates to Supabase
4. Test the updated templates to ensure they work correctly 