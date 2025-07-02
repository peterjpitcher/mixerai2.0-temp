import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth

export const dynamic = "force-dynamic";

/**
 * API route to test database connectivity.
 * WARNING: This endpoint uses an admin Supabase client and is now protected by admin-only authorization.
 * It should be REMOVED or STRICTLY SECURED if kept in deployment.
 */
export const GET = withAdminAuth(async (_request: NextRequest, user) => {
  // Restrict to development environment only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  }
  
  const startTime = Date.now();
  
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data: testData, error: testError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(1);
      
    if (testError) throw testError;
    
    const queryTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful using admin client.',
      diagnostics: {
        dataRetrieved: testData ? true : false,
        recordCount: testData?.length || 0,
        queryTimeMs: queryTime,
        dbUrlConfigured: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No',
        timestamp: new Date().toISOString(),
        authenticatedUserId: user.id
      }
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Database connection test failed', 500);
  }
});

// IMPORTANT: The GET_ENV_VARS function below is NOT a standard Next.js API route handler due to its name.
// If its functionality is needed as an API endpoint, it MUST be:
// 1. Renamed to `GET` (or another standard HTTP verb).
// 2. Placed in its own route file (e.g., /api/test-env-vars/route.ts).
// 3. STRICTLY SECURED with authentication and authorization (e.g., admin-only),
//    as exposing environment variable status can be a security risk.
// If it's obsolete or for internal non-HTTP use, it should be removed to avoid confusion.
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