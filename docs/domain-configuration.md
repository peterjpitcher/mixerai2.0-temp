# Domain Configuration for MixerAI 2.0

This document outlines the necessary changes required to configure MixerAI 2.0 for deployment to the production domain `mixerai.orangejely.co.uk`.

## Environment Variables

The following environment variables should be updated for the production deployment:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Configuration

### Auth Settings

1. Navigate to the Supabase dashboard for your project
2. Go to Authentication > URL Configuration
3. Update the Site URL to: `https://mixerai.orangejely.co.uk`
4. Update the Redirect URLs to include:
   - `https://mixerai.orangejely.co.uk/auth/callback`
   - `https://mixerai.orangejely.co.uk/api/auth/callback`

### Email Templates

The user invitation emails need to be updated to reference the correct domain:

1. Go to Authentication > Email Templates
2. Edit the "Invitation" template
3. Ensure all links point to `https://mixerai.orangejely.co.uk` instead of any development URLs

## Vercel Configuration

If deploying to Vercel:

1. Add a new production environment in the Vercel dashboard
2. Set up the custom domain `mixerai.orangejely.co.uk`
3. Configure environment variables for the production environment
4. Ensure the production branch is set correctly

## DNS Configuration

To configure the DNS for the custom domain:

1. Add a CNAME record for `mixerai.orangejely.co.uk` pointing to your Vercel deployment URL
   - If using Vercel, follow their custom domain setup instructions
2. Configure SSL certificate for secure HTTPS connections

## Application Code Updates

Based on code review, no hardcoded URLs were found in the application code that would need to be updated. The application uses relative URLs for API endpoints and dynamic environment variables for configuration.

The invitation system uses Supabase's built-in invitation functionality which will automatically use the Site URL configured in the Supabase dashboard.

## Testing Checklist

Before full production deployment, test the following functionality with the new domain:

- [ ] User registration process
- [ ] User login
- [ ] Password reset emails
- [ ] User invitations (check that email links work correctly)
- [ ] Authentication persistence
- [ ] API functionality
- [ ] External service integrations (Azure OpenAI)

## SSL Certificate

Ensure that SSL is properly configured for the domain to enable HTTPS, which is required for:

- Secure cookie-based authentication
- Secure API calls
- Modern browser compatibility (many browsers block non-HTTPS requests)

## Monitoring

After deployment, monitor:

1. User invitation and registration flows
2. Authentication success rates
3. API response times
4. Error rates

## Rollback Plan

If issues are encountered with the new domain:

1. Temporarily revert to the previous domain in Supabase Auth settings
2. Update DNS records to point to the previous deployment
3. Notify users of temporary domain change

## Automated Configuration Script

To simplify the domain configuration process, we've created a script that automates several steps:

```bash
# Make the script executable
chmod +x scripts/update-domain-config.sh

# Run the script
./scripts/update-domain-config.sh
```

The script performs the following actions:

1. Updates environment variables with the new domain
2. Configures Vercel settings if the Vercel CLI is available
3. Provides step-by-step instructions for Supabase configuration
4. Guides you through DNS configuration

After running the script, you'll still need to manually update the Supabase settings as described in the output instructions.

## Conclusion

By following these steps, the MixerAI 2.0 application should be correctly configured to run on the `mixerai.orangejely.co.uk` domain with fully functioning authentication and invitation systems. 