import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { Database } from '@/types/supabase';

/**
 * Higher-order function to wrap API handlers with authentication
 * @param handler The API route handler function to be protected
 * @returns A new handler function that first checks authentication
 */
export function withAuth<T>(
  handler: (req: NextRequest, user: any, context?: any) => Promise<Response>
) {
  return async (req: NextRequest, context?: any) => {
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
            set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; sameSite?: "strict" | "lax" | "none"; secure?: boolean }) {
              cookieStore.set(name, value, options);
            },
            remove(name: string, options: { path: string; domain?: string }) {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
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
export function withAuthAndMonitoring<T>(
  handler: (req: NextRequest, user: any, context?: any) => Promise<Response>
) {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
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
            set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; sameSite?: "strict" | "lax" | "none"; secure?: boolean }) {
              cookieStore.set(name, value, options);
            },
            remove(name: string, options: { path: string; domain?: string }) {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
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
      
      // Log request completion time
      const duration = Date.now() - startTime;
      console.log(`API ${path} completed in ${duration}ms`);
      
      return response;
    } catch (error: any) {
      // Log error with details
      const duration = Date.now() - startTime;
      console.error(`API ${path} error after ${duration}ms:`, error);
      
      // Return 500 Internal Server Error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
export function withAdminAuth<T>(
  handler: (req: NextRequest, user: any, context?: any) => Promise<Response>
) {
  return async (req: NextRequest, context?: any) => {
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
            set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; sameSite?: "strict" | "lax" | "none"; secure?: boolean }) {
              cookieStore.set(name, value, options);
            },
            remove(name: string, options: { path: string; domain?: string }) {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
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