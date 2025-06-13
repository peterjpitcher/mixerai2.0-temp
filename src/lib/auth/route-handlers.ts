import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Wrapper for Next.js App Router route handlers that require authentication
 * Specifically designed for dynamic routes with URL parameters
 * 
 * @param handler The API route handler function that requires authentication
 * @returns A new route handler with authentication
 */
export function withRouteAuth(
  handler: (req: NextRequest, user: User, context: Record<string, unknown>) => Promise<Response>
) {
  return async (req: NextRequest, context: Record<string, unknown>) => {
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
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
          },
          { status: 401 }
        );
      }
      
      // Authentication successful, call the handler with user and context
      return handler(req, user, context);
    } catch (error) {
      console.error('API authentication error:', error);
      
      // If there's an error during authentication, return 500 Internal Server Error
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR',
        },
        { status: 500 }
      );
    }
  };
} 