/**
 * Email Template Verification Utilities
 * 
 * These utilities help verify that Supabase email templates
 * have been properly configured for the production domain.
 */

/**
 * Verifies if email templates contain the correct domain
 * This is a helper function that logs warnings if the templates 
 * appear to be using the wrong domain
 */
export async function verifyEmailTemplates() {
  try {
    const expectedDomain = process.env.NEXT_PUBLIC_APP_URL || 'mixerai.orangejely.co.uk';
    
    // Only run in development mode to avoid API rate limits in production
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    // const supabase = createSupabaseAdminClient();
    
    // This operation requires admin access to email templates
    // Note: As of the current Supabase JS client, there is no direct API
    // to retrieve email templates. This is typically managed through the Supabase dashboard.
    
    // Log a reminder about checking email templates
    console.log(`
------------------------------------------------------
⚠️  EMAIL TEMPLATE VERIFICATION REMINDER
------------------------------------------------------
Please ensure your Supabase email templates are configured
for the correct domain: ${expectedDomain}

Go to Supabase Dashboard:
1. Authentication > Email Templates 
2. Check the "Invitation" template
3. Ensure all links point to ${expectedDomain}
------------------------------------------------------
    `);
    
  } catch (error) {
    console.error('Error in email template verification:', error);
  }
}

/**
 * Checks if the application is configured with the production domain
 */
export function isDomainConfigured() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const productionDomain = 'mixerai.orangejely.co.uk';
  
  if (!appUrl) {
    return false;
  }
  
  try {
    const url = new URL(appUrl);
    return url.hostname === productionDomain || url.hostname.endsWith(`.${productionDomain}`);
  } catch {
    // If URL parsing fails, fall back to simple string check
    return appUrl.indexOf(`//${productionDomain}`) !== -1 || appUrl.indexOf(`//*.${productionDomain}`) !== -1;
  }
} 