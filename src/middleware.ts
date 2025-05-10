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
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth middleware session error:', authError);
          // Potentially handle error, for now, let it proceed to be caught by page-level checks or return generic error
        }

        if (!authData.session) {
          // Redirect to login for dashboard or account routes
          if (request.nextUrl.pathname.startsWith('/dashboard') ||
              request.nextUrl.pathname.startsWith('/account')) {
            const redirectUrl = new URL('/auth/login', baseUrl);
            redirectUrl.searchParams.set('from', request.nextUrl.pathname);
            // Set headers on the redirect response as well
            const redirectResponse = NextResponse.redirect(redirectUrl);
            redirectResponse.headers.set('X-Content-Type-Options', 'nosniff');
            redirectResponse.headers.set('X-Frame-Options', 'DENY');
            redirectResponse.headers.set('X-XSS-Protection', '1; mode=block');
            redirectResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
            return redirectResponse;
          }
          
          // Return 401 for API routes
          if (request.nextUrl.pathname.startsWith('/api/')) {
            // Ensure this is not an explicitly public API route from the matcher
            const publicApiPatterns = [
              'api/env-check', 
              'api/test-connection', 
              'api/test-metadata-generator', 
              'api/brands/identity'
              // Note: api/content-templates/ is no longer public
            ];
            const isPublicApi = publicApiPatterns.some(pattern => request.nextUrl.pathname.includes(pattern));

            if (!isPublicApi) {
              const apiUnauthorizedResponse = new NextResponse(
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
              // Set headers on the 401 response
              apiUnauthorizedResponse.headers.set('X-Content-Type-Options', 'nosniff');
              apiUnauthorizedResponse.headers.set('X-Frame-Options', 'DENY');
              apiUnauthorizedResponse.headers.set('X-XSS-Protection', '1; mode=block');
              apiUnauthorizedResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
              return apiUnauthorizedResponse;
            }
          }
        } else {
          // User is authenticated
          // If they are on the root path, redirect to /dashboard
          if (request.nextUrl.pathname === '/') {
            const dashboardUrl = new URL('/dashboard', baseUrl);
            // Set headers on the redirect response
            const rootRedirectResponse = NextResponse.redirect(dashboardUrl);
            rootRedirectResponse.headers.set('X-Content-Type-Options', 'nosniff');
            rootRedirectResponse.headers.set('X-Frame-Options', 'DENY');
            rootRedirectResponse.headers.set('X-XSS-Protection', '1; mode=block');
            rootRedirectResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
            return rootRedirectResponse;
          }
        }
      } catch (error) {
        console.error('Auth middleware error:', error);
      }
    } else if (request.nextUrl.pathname === '/') {
      // Handle root path for potentially unauthenticated users if Supabase client wasn't initialized
      // (e.g. env vars missing). This case should try to get session or redirect to login.
      // This is a bit defensive, primary auth logic is inside the supabaseUrl && supabaseAnonKey block.
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
          cookies: { /* cookie handlers */ }
        });
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session) {
          const redirectUrl = new URL('/auth/login', baseUrl);
          redirectUrl.searchParams.set('from', '/');
          const rootLoginRedirect = NextResponse.redirect(redirectUrl);
          // Set headers
          rootLoginRedirect.headers.set('X-Content-Type-Options', 'nosniff');
          rootLoginRedirect.headers.set('X-Frame-Options', 'DENY');
          rootLoginRedirect.headers.set('X-XSS-Protection', '1; mode=block');
          rootLoginRedirect.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
          return rootLoginRedirect;
        } else {
          const dashboardUrl = new URL('/dashboard', baseUrl);
          const rootDashboardRedirect = NextResponse.redirect(dashboardUrl);
          // Set headers
          rootDashboardRedirect.headers.set('X-Content-Type-Options', 'nosniff');
          rootDashboardRedirect.headers.set('X-Frame-Options', 'DENY');
          rootDashboardRedirect.headers.set('X-XSS-Protection', '1; mode=block');
          rootDashboardRedirect.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
          return rootDashboardRedirect;
        }
      } catch(e) {
        console.error('Error handling root path for unauthenticated or Supabase client issue:', e);
        // Fallback, let it proceed to be handled by the page if possible
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