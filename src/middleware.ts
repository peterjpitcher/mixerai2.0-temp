import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * This middleware adds security headers and handles authentication for protected routes
 */
export async function middleware(request: NextRequest) {
  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Set up Supabase client for authentication check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Get base URL for redirects, using configured domain if available
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  
  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = cookies();
    
    // Create Supabase client
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Handle authentication for protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard') || 
        request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname.startsWith('/account')) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Redirect to login for dashboard or account routes
          if (request.nextUrl.pathname.startsWith('/dashboard') ||
              request.nextUrl.pathname.startsWith('/account')) {
            const redirectUrl = new URL('/auth/login', baseUrl);
            redirectUrl.searchParams.set('from', request.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
          }
          
          // Return 401 for API routes
          if (request.nextUrl.pathname.startsWith('/api/')) {
            return new NextResponse(
              JSON.stringify({ 
                success: false, 
                error: 'Unauthorized', 
                code: 'AUTH_REQUIRED' 
              }),
              { 
                status: 401, 
                headers: { 'content-type': 'application/json' } 
              }
            );
          }
        }
      } catch (error) {
        console.error('Auth middleware error:', error);
      }
    }
  }
  
  const { pathname } = request.nextUrl;
  
  // ===================================================================
  // Route Redirection Logic
  // Part of the June 2024 Route Cleanup project (see docs/ROUTE_CLEANUP_COMPLETION.md)
  // This middleware works with next.config.js redirects to ensure a 
  // single source of truth for all routes by redirecting top-level routes
  // to their /dashboard equivalents.
  // ===================================================================
  
  // Normalize path to handle path traversal attempts
  const normalizedPath = pathname.replace(/\/\.\.\//g, '/');
  
  // Special case for /content root
  if (pathname === '/content') {
    const url = new URL('/dashboard/content/article', request.url);
    // Preserve query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    console.log(`Redirecting content root: ${pathname} → ${url.pathname}${url.search}`);
    return NextResponse.redirect(url);
  }
  
  // Check if path starts with any of our top-level non-dashboard routes
  if (['/brands', '/workflows', '/content', '/users']
      .some(prefix => normalizedPath.startsWith(prefix))) {
    
    // Create the new path by replacing the prefix
    const newPath = normalizedPath.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    );
    
    // Preserve query parameters
    const url = new URL(newPath, request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    console.log(`Redirecting: ${pathname} → ${url.pathname}${url.search}`);
    return NextResponse.redirect(url);
  }
  
  return response;
}

// Configure paths to include in middleware processing
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. Public API routes that don't need auth
     * 2. /_next (Next.js internals)
     * 3. /public (public files)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/env-check|api/test-connection|api/test-metadata-generator|api/brands/identity|_next/static|_next/image|public|favicon.ico).*)',
    '/brands/:path*',
    '/workflows/:path*',
    '/content/:path*',
    '/users/:path*',
  ],
}; 