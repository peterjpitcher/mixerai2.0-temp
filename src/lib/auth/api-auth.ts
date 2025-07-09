import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';
import { withCSRF } from '@/lib/api/with-csrf';

/**
 * Higher-order function to wrap API handlers with authentication
 * @param handler The API route handler function to be protected
 * @returns A new handler function that first checks authentication
 */
export function withAuth(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      const cookieStore = cookies();
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );
      
      // Get the current user session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // If authentication fails, return 401 Unauthorized
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      }
      
      // Authentication successful, call the handler with the authenticated user
      return handler(req, user, context);
    } catch (error) {
      console.error('API authentication error:', error);
      
      // If there's an error during authentication, return 500 Internal Server Error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  };
}

/**
 * Higher-order function that adds authentication and monitoring
 * @param handler The API route handler function to be protected and monitored
 * @returns A new handler function with auth checks and monitoring
 */
export function withAuthAndMonitoring(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context?: unknown) => {
    const path = req.nextUrl.pathname;
    
    try {
      const cookieStore = cookies();
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );
      
      // Get the current user session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Log authentication failure
        console.warn(`Auth failed for ${path}:`, error?.message || 'No user');
        
        // Return 401 Unauthorized
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      }
      
      // Authentication successful, call the handler
      const response = await handler(req, user, context);
      
      // Request completed successfully
      
      return response;
    } catch (error) {
      // Log error with details
      const duration = Date.now() - startTime;
      console.error(`API ${path} error after ${duration}ms:`, error);
      
      // Return 500 Internal Server Error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  };
} 

/**
 * Higher-order function to wrap API handlers with admin-level authentication
 * @param handler The API route handler function to be protected
 * @returns A new handler function that first checks authentication and admin role
 */
export function withAdminAuth(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      const cookieStore = cookies();
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );
      
      // Get the current user session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // If authentication fails, return 401 Unauthorized
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      }

      // Check if the user is an admin
      // Assumes role is stored in user_metadata
      if (user.user_metadata?.role !== 'admin') {
        // If not an admin, return 403 Forbidden
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Admin access required',
            code: 'ADMIN_REQUIRED',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      }
      
      // Authentication and authorization successful, call the handler
      return handler(req, user, context);
    } catch (error) {
      console.error('API admin authentication error:', error);
      
      // If there's an error during auth checks, return 500 Internal Server Error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error during authorization',
          code: 'SERVER_ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  };
}

/**
 * Higher-order function to wrap API handlers with authentication and CSRF protection
 * @param handler The API route handler function to be protected
 * @returns A new handler function that first checks authentication and CSRF token
 */
export function withAuthAndCSRF(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return withCSRF(withAuth(handler));
}

/**
 * Higher-order function to wrap API handlers with admin-level authentication and CSRF protection
 * @param handler The API route handler function to be protected
 * @returns A new handler function that first checks authentication, admin role, and CSRF token
 */
export function withAdminAuthAndCSRF(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return withCSRF(withAdminAuth(handler));
}

/**
 * Higher-order function that adds authentication, monitoring, and CSRF protection
 * @param handler The API route handler function to be protected and monitored
 * @returns A new handler function with auth checks, monitoring, and CSRF protection
 */
export function withAuthMonitoringAndCSRF(
  handler: (req: NextRequest, user: User, context?: unknown) => Promise<Response>
) {
  return withCSRF(withAuthAndMonitoring(handler));
}

/**
 * Checks if a user has an 'admin' role for a specific brand.
 * @param userId The ID of the user.
 * @param brandId The ID of the brand.
 * @param supabase An initialized Supabase client (usually admin client for this check).
 * @returns True if the user is an admin for the brand, false otherwise.
 */
export async function isBrandAdmin(
  userId: string,
  brandId: string,
  supabase: ReturnType<typeof createServerClient> // SupabaseClient from @supabase/supabase-js
): Promise<boolean> {
  if (!userId || !brandId) {
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return false;
      }
      console.error(`Error checking brand admin permission for user ${userId}, brand ${brandId}:`, error);
      return false; // Fail closed on other errors
    }
    return data?.role === 'admin';
  } catch (e) {
    console.error(`Exception checking brand admin permission for user ${userId}, brand ${brandId}:`, e);
    return false;
  }
} 