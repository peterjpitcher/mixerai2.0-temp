import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { validateCSRFToken, CSRF_ERROR_RESPONSE } from '@/lib/csrf';

let authModulePromise: Promise<typeof import('@/lib/auth/api-auth')> | null = null;

async function getAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import('@/lib/auth/api-auth');
  }
  return authModulePromise;
}

/**
 * Wrapper function that adds CSRF protection to API route handlers
 * 
 * @example
 * export const POST = withCSRF(withAuth(async (req, user) => {
 *   // Your handler code here
 * }));
 * 
 * @example
 * // For handlers without auth
 * export const POST = withCSRF(async (req) => {
 *   // Your handler code here
 * });
 */
export function withCSRF<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<Response>
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    // Validate CSRF token
    if (!validateCSRFToken(req)) {
      return NextResponse.json(
        {
          ...CSRF_ERROR_RESPONSE,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }
    
    // Call the original handler
    return handler(req, ...args);
  };
}

/**
 * Combined wrapper for both auth and CSRF protection
 * This is a convenience wrapper that applies both withAuth and withCSRF
 * 
 * @example
 * import { withAuthAndCSRF } from '@/lib/api/with-csrf';
 * 
 * export const POST = withAuthAndCSRF(async (req, user, context) => {
 *   // Your handler code here
 * });
 */
export function withAuthAndCSRF(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context?: unknown) => {
    const { withAuth } = await getAuthModule();
    const protectedHandler = withAuth(handler);
    return withCSRF(protectedHandler)(req, context);
  };
}
