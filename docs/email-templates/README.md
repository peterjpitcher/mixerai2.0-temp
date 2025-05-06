# MixerAI Email Templates

This folder contains HTML email templates for use with Supabase Authentication. These templates are designed to match the MixerAI branding and ensure consistent user experience across the application.

## Available Templates

1. **Invitation Email** - `invitation.html`
   - Sent when inviting new users to join the platform
   
2. **Confirm Signup** - `confirm-signup.html`
   - Sent when a new user signs up to verify their email address
   
3. **Reset Password** - `reset-password.html`
   - Sent when a user requests a password reset

4. **Magic Link** - `magic-link.html`
   - Sent when a user requests a passwordless login

## How to Use These Templates in Supabase

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Email Templates**
4. For each template type:
   - Click **Edit**
   - Copy the HTML content from the corresponding template file
   - Paste it into the HTML section
   - Click **Save**

## Template Variables

Supabase uses the following variables in email templates:

- `{{ .SiteURL }}` - The site URL configured in your Supabase settings
- `{{ .ConfirmationToken }}` - The unique token for email confirmation
- `{{ .Email }}` - The recipient's email address

These variables will be automatically replaced with the appropriate values when the email is sent.

## Important Notes

1. **Site URL Configuration**: Make sure your site URL is correctly set to `https://mixerai.orangejely.co.uk` in Supabase Authentication settings.

2. **Testing**: After updating the templates, send a test email to ensure they render correctly in various email clients.

3. **Email Delivery**: Supabase uses a reliable email delivery service, but some emails may end up in spam folders. Advise users to check their spam if they don't receive expected emails.

4. **Branding**: These templates use the MixerAI blue color (#13599f) for consistent branding.

## Customizing Templates

If you need to modify these templates:

1. Make sure to maintain the template variables (with `{{ }}` syntax)
2. Test thoroughly after making changes
3. Keep the responsive design to ensure templates work on all devices

## Email Client Compatibility

These templates have been designed to work with most modern email clients, including:

- Gmail
- Outlook
- Apple Mail
- Yahoo Mail
- Most mobile email clients

## Troubleshooting

If users aren't receiving emails:

1. Check your Supabase dashboard for email errors
2. Verify the email templates are correctly installed
3. Ensure your Supabase project has email enabled
4. Check if the email might be in the user's spam folder 