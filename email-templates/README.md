# Email Templates Configuration Guide

## Overview
These email templates are designed to be uploaded to Supabase Dashboard under Authentication > Email Templates. Each template uses Supabase's built-in template variables.

## Available Supabase Variables

The following variables are automatically populated by Supabase:

- `{{ .Email }}` - The recipient's email address
- `{{ .ConfirmationURL }}` - The complete confirmation URL (includes token and redirect)
- `{{ .SiteURL }}` - Your site's base URL (from Supabase configuration)
- `{{ .Now.Year }}` - Current year for copyright notices

## Template Files

1. **change-email.html** - Email change confirmation
2. **confirm-signup.html** - New user signup confirmation
3. **invitation.html** - User invitation to join the platform
4. **magic-link.html** - Passwordless login link
5. **reset-password.html** - Password reset request
6. **reauthentication.html** - Re-authentication for sensitive actions

## Configuration Steps

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Email Templates
3. For each email type:
   - Select the email template type
   - Copy the entire HTML content from the corresponding file
   - Paste it into the template editor
   - Save the template

## Important Notes

- **Do NOT modify** the variable syntax `{{ .Variable }}` - these are Supabase template variables
- The `{{ .ConfirmationURL }}` already includes the full URL with token - no need to construct it manually
- Ensure your Site URL is correctly configured in Supabase (Authentication > URL Configuration)
- Test each template after uploading to ensure proper functionality

## Redirect URLs

Make sure these routes exist in your application:
- `/auth/confirm` - Handles email confirmations (signup, email change, invitations)
- The confirm page should handle the `code` parameter that Supabase provides

## Template Updates (January 2025)

### URL Structure
- Changed from manual URL construction (`{{ .SiteURL }}/auth/confirm?token={{ .ConfirmationToken }}`) to using Supabase's built-in `{{ .ConfirmationURL }}`
- This ensures compatibility with Supabase's authentication flow

### Spam Prevention Improvements
- Added preview text for inbox display
- Changed greetings to "Hi there" (Supabase doesn't support name personalization)
- Implemented professional HTML structure with email client compatibility
- Added descriptive alt text for all images
- Included reply-to instructions in footer
- Added clear value propositions and explanations
- Included trust signals and security notes
- Ensured CAN-SPAM compliance with proper footer information
- Used less promotional, more informational tone
- Added proper language attributes and meta tags
- Maintained 60/40 text-to-image ratio
- Limited email width to 600px for optimal rendering

### Design Consistency
- All templates now use consistent MixerAI branding
- Professional font stack for cross-platform compatibility
- Responsive design for mobile devices
- Accessible color contrast and styling

## CRITICAL: Required Configuration

### 1. Email Compliance Note
**Physical Mailing Address**: While CAN-SPAM Act and similar regulations typically require a physical mailing address, MixerAI operates as a digital service without a physical office. Consider adding a registered business address or P.O. Box if required for your jurisdiction.

### 2. Supabase Variable Limitations
Supabase email templates have limited personalization options:
- ✅ `{{ .Email }}` - Recipient's email address
- ✅ `{{ .ConfirmationURL }}` - The complete confirmation URL
- ✅ `{{ .SiteURL }}` - Your site's base URL
- ✅ `{{ .Now.Year }}` - Current year
- ❌ `{{ .FirstName }}` - NOT AVAILABLE in Supabase

Due to these limitations, all templates use "Hi there," as the greeting. To use personalized greetings with first names, you would need to:
1. Switch to a custom SMTP provider (SendGrid, Postmark, etc.)
2. Store user names in your database and handle email sending in your application

### 3. Email Authentication (SPF/DKIM/DMARC)
Refer to `email-template-standards.md` for detailed setup instructions for your email provider.

### 4. Support Email
All templates use the official support email: `peter.pitcher@genmills.com`

## Additional Documentation

For comprehensive guidelines including:
- Design standards and color palette
- Spam prevention best practices
- Technical configuration (SPF/DKIM/DMARC)
- Email client compatibility
- Template checklist for new emails

Please refer to `email-template-standards.md`