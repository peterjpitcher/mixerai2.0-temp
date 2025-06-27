import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { generateCSRFToken, validateCSRFToken, shouldProtectRoute, CSRF_ERROR_RESPONSE } from '@/lib/csrf';
import { checkRateLimit, rateLimitConfigs, getRateLimitHeaders, type RateLimitConfig } from '@/lib/rate-limit';
import { validateSession, sessionNeedsRenewal, createSession } from '@/lib/auth/session-manager';
import { sessionConfig } from '@/lib/auth/session-config';

/**
 * This middleware adds security headers, rate limiting, and handles authentication for protected routes
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
  
  // Force JSON responses for API routes to prevent Vercel HTML error pages
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('x-api-route', 'true');
  }

  // Rate Limiting
  const pathForRateLimit = request.nextUrl.pathname;
  let rateLimitConfig: RateLimitConfig = rateLimitConfigs.api; // Default rate limit
  
  // Apply different rate limits based on endpoint type
  if (pathForRateLimit.startsWith('/api/auth/') || pathForRateLimit.startsWith('/auth/')) {
    rateLimitConfig = rateLimitConfigs.auth;
  } else if (pathForRateLimit.startsWith('/api/ai/') || pathForRateLimit.startsWith('/api/content/generate') || 
             pathForRateLimit.startsWith('/api/tools/')) {
    // Check for expensive AI operations
    if (pathForRateLimit.includes('/generate') || pathForRateLimit.includes('/transcreator') || 
        pathForRateLimit.includes('/identity')) {
      rateLimitConfig = rateLimitConfigs.aiExpensive;
    } else {
      rateLimitConfig = rateLimitConfigs.ai;
    }
  } else if (pathForRateLimit.includes('/workflows') && pathForRateLimit.includes('/assign')) {
    // Only use sensitive rate limit for workflow assignment operations
    rateLimitConfig = rateLimitConfigs.sensitive;
  }
  
  // Check rate limit
  const rateLimitResult = checkRateLimit(request, rateLimitConfig);
  
  // Apply rate limit headers to response
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.allowed) {
    // For API routes, always return JSON
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: rateLimitConfig.message || 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers.entries()),
          },
        }
      );
    }
    // For non-API routes, return a simple text response
    return new NextResponse(
      rateLimitConfig.message || 'Too many requests. Please try again later.',
      {
        status: 429,
        headers: {
          'Content-Type': 'text/plain',
          ...Object.fromEntries(response.headers.entries()),
        },
      }
    );
  }

  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    const isProtectedRoute = shouldProtectRoute(request.nextUrl.pathname);
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    
    // Enforce CSRF for all mutation methods on protected routes
    if (isProtectedRoute && isMutationMethod && !validateCSRFToken(request)) {
      console.warn(`CSRF validation failed for ${method} ${request.nextUrl.pathname}`);
      
      // Return 403 Forbidden for invalid CSRF token
      return new NextResponse(
        JSON.stringify({
          ...CSRF_ERROR_RESPONSE,
          method,
          path: request.nextUrl.pathname
        }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
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

  // Define public routes that don't need authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/callback',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/api/env-check',
    '/api/test-connection',
    '/api/test-metadata-generator',
    '/api/brands/identity',
    '/api/auth/callback',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/health'
  ];
  
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  // Skip authentication for public routes
  if (isPublicRoute) {
    return response;
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

    const { data: { user: refreshedUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.warn('Middleware: supabase.auth.getUser() error:', userError.message);
    }
    
    // Add user ID to request headers for rate limiting
    if (refreshedUser?.id) {
      requestHeaders.set('x-user-id', refreshedUser.id);
    }
    
    // Session management
    const sessionId = request.cookies.get('app-session-id')?.value;
    let isSessionValid = false;
    
    if (refreshedUser?.id) {
      if (sessionId) {
        // Validate existing session
        const sessionValidation = await validateSession(sessionId);
        isSessionValid = sessionValidation.valid && sessionValidation.userId === refreshedUser.id;
        
        if (!isSessionValid) {
          // Create new session if invalid
          const newSessionId = await createSession(refreshedUser.id);
          response.cookies.set('app-session-id', newSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: sessionConfig.absoluteTimeout / 1000,
            path: '/',
          });
          isSessionValid = true;
        } else if (sessionNeedsRenewal(sessionId)) {
          // Session is valid but needs renewal
          const newSessionId = await createSession(refreshedUser.id);
          response.cookies.set('app-session-id', newSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: sessionConfig.absoluteTimeout / 1000,
            path: '/',
          });
        }
      } else {
        // No session cookie, create new session
        const newSessionId = await createSession(refreshedUser.id);
        response.cookies.set('app-session-id', newSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: sessionConfig.absoluteTimeout / 1000,
          path: '/',
        });
        isSessionValid = true;
      }
    }

    if (request.nextUrl.pathname.startsWith('/dashboard') || 
        request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname.startsWith('/account')) {
      if (!refreshedUser || (refreshedUser && !isSessionValid)) {
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
                headers: { 'Content-Type': 'application/json' } // Base headers for JSON response
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
        if (!refreshedUser) {
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
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico, robots.txt, sitemap.xml (static files)
     * 4. Images and other static assets
     * 
     * The auth check will handle public vs protected routes
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}; 