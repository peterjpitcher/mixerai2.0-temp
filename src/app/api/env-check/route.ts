import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/api-utils';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth

const diagnosticsEnabled = process.env.ENABLE_HEALTH_DIAGNOSTICS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'Environment diagnostics are disabled. Set ENABLE_HEALTH_DIAGNOSTICS=true to enable locally.' },
    { status: 410 }
  );
}

export const dynamic = "force-dynamic"; // Ensures the route is always dynamic

/**
 * API route to test environment status, including DB connectivity and some env var presence.
 * WARNING: This endpoint is now protected by admin-only authorization.
 * It should be REMOVED or STRICTLY SECURED if kept in deployment.
 */
export const GET = withAdminAuth(async (_request: NextRequest, user) => {
  if (!diagnosticsEnabled) {
    return disabledResponse();
  }
  // Restrict to development environment only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  }
  
  try {
    // Check environment variables
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';
    const useLocalGeneration = process.env.USE_LOCAL_GENERATION === 'true';
    const debugMode = process.env.DEBUG_MODE === 'true';

    // Check Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let supabaseConnected = false;
    let supabaseTestQueryError: string | null = null;
    
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabase.from('brands').select('id', { head: true }).limit(1);
        if (error) {
            supabaseTestQueryError = error.message;
        } else {
            supabaseConnected = true;
        }
      } catch (error: unknown) {
        supabaseTestQueryError = (error as Error).message || 'Unknown Supabase client error';
      }
    }

    // Check for direct database connection
    const directDbConnected = !!(
      process.env.POSTGRES_HOST && 
      process.env.POSTGRES_PORT && 
      process.env.POSTGRES_USER && 
      process.env.POSTGRES_PASSWORD && 
      process.env.POSTGRES_DB
    );

    // Check template availability
    const localTemplatesAvailable = true; // Should always be available as fallback

    return NextResponse.json({
      success: true,
      diagnostics: {
        azureOpenAIConfigured: !!(azureEndpoint && azureApiKey && azureDeployment),
        azureOpenAIApiKeySet: !!azureApiKey,
        azureOpenAIEndpointSet: !!azureEndpoint,
        azureOpenAIDeploymentSet: !!azureDeployment,
        azureApiVersionUsed: azureApiVersion,
        useLocalGenerationEnabled: useLocalGeneration,
        supabaseClientConnection: supabaseConnected,
        supabaseClientTestQueryError: supabaseTestQueryError,
        supabaseUrlConfigured: !!supabaseUrl,
        databaseProvider: supabaseConnected ? 'Supabase (via client)' : (directDbConnected ? 'Direct PostgreSQL (env vars set)' : 'None Configured'),
        localFallbackTemplatesMarkedAvailable: localTemplatesAvailable,
        directDbConfigSet: directDbConnected,
        debugModeEnabled: debugMode,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        checkedByUserId: user.id
      }
    });
  } catch (error: unknown) {
    return handleApiError(error, `Failed to check environment: ${(error as Error).message}`);
  }
});

// IMPORTANT: The GET_ENV_VARS function below is NOT a standard Next.js API route handler due to its name.
// It has been commented out as its functionality is largely covered by the secured GET above,
// and exposing env vars directly, even booleans for existence, should be done with extreme caution
// via a well-secured and purpose-built endpoint if absolutely necessary.
// If this specific breakout of env var existence is still needed, it must be:
// 1. Renamed to `GET` (or another standard HTTP verb).
// 2. Placed in its own route file (e.g., /api/test-specific-env-vars/route.ts).
// 3. STRICTLY SECURED with authentication and admin-level authorization.
/*
export async function GET_ENV_VARS() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_OPENAI_API_KEY_EXISTS: !!process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT_EXISTS: !!process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_EXISTS: !!process.env.AZURE_OPENAI_DEPLOYMENT,
  };

  return NextResponse.json({ 
    success: true, 
    message: "Environment variable status check (minimal info for security)", 
    data: envVars 
  });
}
*/ 
