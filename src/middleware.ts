import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { generateCSRFToken, validateCSRFToken, shouldProtectRoute, CSRF_ERROR_RESPONSE } from '@/lib/csrf';

/**
 * This middleware adds security headers and handles authentication for protected routes
 */
export async function middleware(request: NextRequest) {
  // Clone the request headers to avoid modifying the original request headers object.
  // This is important for Next.js middleware.
  const requestHeaders = new Headers(request.headers);
  // Create a response object that we can modify for setting cookies
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const isProtectedRoute = shouldProtectRoute(request.nextUrl.pathname);
    
    if (isProtectedRoute && !validateCSRFToken(request)) {
      // Return 403 Forbidden for invalid CSRF token
      return new NextResponse(
        JSON.stringify(CSRF_ERROR_RESPONSE),
        { 
          status: 403, 
          headers: { 
            'content-type': 'application/json',
            ...Object.fromEntries(response.headers.entries())
          } 
        }
      );
    }
  }

  // Generate and set CSRF token cookie if not present
  if (!request.cookies.get('csrf-token')) {
    const csrfToken = generateCSRFToken();
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Determine the base URL based on the environment
  let baseUrl = request.nextUrl.origin; // Default to current origin (good for local dev)

  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    // For Vercel production deployments, use the canonical app URL if set
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    // For Vercel preview or other Vercel deployments, use the Vercel-provided URL
    // NEXT_PUBLIC_VERCEL_URL does not include the protocol, so we add it.
    baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  // For local development (NEXT_PUBLIC_VERCEL_ENV is not set or is 'development'),
  // request.nextUrl.origin (the initial value of baseUrl) is appropriate.

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.delete(name);
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
            response.cookies.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.warn('Middleware: supabase.auth.getSession() error (token refresh might have failed):', sessionError.message);
    }

    if (request.nextUrl.pathname.startsWith('/dashboard') || 
        request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname.startsWith('/account')) {
      if (!refreshedSession) {
        // Handle /dashboard/* and /account/* page routes: redirect to login
        if (request.nextUrl.pathname.startsWith('/dashboard') ||
            request.nextUrl.pathname.startsWith('/account')) {
          const redirectUrl = new URL('/auth/login', baseUrl);
          redirectUrl.searchParams.set('from', request.nextUrl.pathname);
          // Preserve original security headers if any were set on the redirect
          const existingHeaders = new Headers(response.headers);
          response = NextResponse.redirect(redirectUrl);
          existingHeaders.forEach((val, key) => {
            if (!response.headers.has(key)) response.headers.set(key, val);
          });
          // Ensure necessary security headers are always on the redirect
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
          response.headers.set('X-XSS-Protection', '1; mode=block');
          response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

        // Handle /api/* routes: return 401 JSON if not a public API
        } else if (request.nextUrl.pathname.startsWith('/api/')) {
          const publicApiPatterns = [
            'api/env-check', 
            'api/test-connection', 
            'api/test-metadata-generator', 
            'api/brands/identity'
            // Add other public API patterns as needed
          ];
          const isPublicApi = publicApiPatterns.some(pattern => request.nextUrl.pathname.includes(pattern));

          if (!isPublicApi) {
            // Preserve original security headers if any were set on the response
            const existingHeaders = new Headers(response.headers);
            response = new NextResponse(
              JSON.stringify({ 
                success: false, 
                error: 'Unauthorized', 
                code: 'AUTH_REQUIRED' 
              }),
              { 
                status: 401, 
                headers: { 'content-type': 'application/json' } // Base headers for JSON response
              }
            );
            // Apply existing headers to the new 401 response
            existingHeaders.forEach((val, key) => {
                if (!response.headers.has(key) && key.toLowerCase() !== 'content-type') { // Don't overwrite content-type
                    response.headers.set(key, val);
                }
            });
          }
          // If it IS a public API, response remains NextResponse.next(), allowing access
        }
      }
    } else if (request.nextUrl.pathname === '/') {
      if (supabaseUrl && supabaseAnonKey) {
        if (!refreshedSession) {
          const redirectUrl = new URL('/auth/login', baseUrl);
          redirectUrl.searchParams.set('from', '/');
          response = NextResponse.redirect(redirectUrl);
        } else {
          const dashboardUrl = new URL('/dashboard', baseUrl);
          response = NextResponse.redirect(dashboardUrl);
        }
      } else {
        const redirectUrl = new URL('/auth/login', baseUrl);
        redirectUrl.searchParams.set('from', '/');
        response = NextResponse.redirect(redirectUrl);
      }
    }
  } else {
    console.error("Supabase URL or Anon Key is not configured. Middleware cannot perform authentication.");
  }
  
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.replace(/\/\.\.\//g, '/');
  if (['/brands', '/workflows', '/content', '/users']
      .some(prefix => normalizedPath.startsWith(prefix))) {
    const newPath = normalizedPath.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    );
    const url = new URL(newPath, request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    console.log(`Redirecting: ${pathname} → ${url.pathname}${url.search}`);
    const redirectWithHeaders = NextResponse.redirect(url);
    response.headers.forEach((value, key) => {
        if (!redirectWithHeaders.headers.has(key)) {
            redirectWithHeaders.headers.set(key, value);
        }
    });
    return redirectWithHeaders;
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