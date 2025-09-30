import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { generateCSRFToken, validateCSRFToken } from '@/lib/csrf';
import { checkRateLimit, getRateLimitType } from '@/lib/rate-limit-simple';
import { createSession, validateSession, renewSession, type SessionRecord } from '@/lib/auth/session-manager';
import { SESSION_CONFIG } from '@/lib/auth/session-config';
import type { User } from '@supabase/supabase-js';

// Pre-compiled route patterns for performance
const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/auth/confirm',
  '/auth/update-password',
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
]);

// Fast path checking for public routes
const isPublicRoute = (pathname: string): boolean => {
  // Check exact matches first
  if (PUBLIC_ROUTES.has(pathname)) return true;
  
  // Check prefix matches for auth routes
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return PUBLIC_ROUTES.has(pathname);
  }
  
  return false;
};

// Security headers as constants (avoid recreating on each request)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};

// Mutation methods that require CSRF protection
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Skip patterns for CSRF protection
const CSRF_SKIP_PATTERNS = [
  '/api/auth/',
  '/api/health',
  '/api/env-check',
  '/api/test-'
];

const shouldSkipCSRF = (pathname: string): boolean => {
  return CSRF_SKIP_PATTERNS.some(pattern => pathname.includes(pattern));
};

/**
 * Optimized middleware with reduced overhead
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/private-bookings')) {
    console.warn('[middleware] Blocking legacy private-bookings request', {
      url: request.url,
      method: request.method,
      hasServerAction: request.headers.has('next-action'),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'The /private-bookings endpoint has been retired. Please update any integrations to use current MixerAI APIs.',
      },
      {
        status: 410,
        headers: {
          'Cache-Control': 'no-store',
          Allow: 'GET,POST,PUT,DELETE,OPTIONS',
        },
      },
    );
  }
  
  // Fast path: Skip middleware for static assets (double-check in case matcher misses)
  if (pathname.includes('/_next/') || pathname.includes('/static/')) {
    return NextResponse.next();
  }
  
  // Initialize response with security headers
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
  
  // Apply security headers in one go
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Mark API routes
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute) {
    response.headers.set('x-api-route', 'true');
  }
  
  // CSRF Protection for API routes (optimized)
  if (isApiRoute && MUTATION_METHODS.has(request.method) && !shouldSkipCSRF(pathname)) {
    if (!validateCSRFToken(request)) {
      console.warn(`CSRF validation failed for ${request.method} ${pathname}`);
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'CSRF validation failed',
          code: 'CSRF_ERROR',
          method: request.method,
          path: pathname
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
  
  // Generate CSRF token if not present
  if (!request.cookies.get('csrf-token')) {
    const csrfToken = generateCSRFToken();
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }
  
  // Skip authentication for public routes
  if (isPublicRoute(pathname)) {
    return response;
  }
  
  // Authentication check (only for protected routes)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase configuration missing");
    return response;
  }
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
  
  const { data: { user: refreshedUser }, error: userError } = await supabase.auth.getUser();
  
  if (userError && !pathname.startsWith('/auth/')) {
    console.warn('Middleware: auth.getUser() error:', userError.message);
  }
  
  // Rate limiting (only for protected routes) - run after auth to include user identifier
  if (!isPublicRoute(pathname)) {
    const rateLimitType = getRateLimitType(pathname);
    const rateLimitResult = await checkRateLimit(request, rateLimitType, refreshedUser?.id);

    if (rateLimitResult.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    if (!rateLimitResult.allowed) {
      const errorResponse = {
        success: false,
        error: rateLimitResult.message || 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      };

      return new NextResponse(
        isApiRoute ? JSON.stringify(errorResponse) : errorResponse.error,
        {
          status: 429,
          headers: {
            'Content-Type': isApiRoute ? 'application/json' : 'text/plain',
            ...Object.fromEntries(response.headers.entries()),
          },
        }
      );
    }
  }

  // Session management (only if user exists)
  if (refreshedUser?.id) {
    const sessionId = request.cookies.get('app-session-id')?.value;
    let isSessionValid = false;
    
    if (sessionId) {
      let sessionValidation;
      try {
        sessionValidation = await validateSession(sessionId);
      } catch (error) {
        console.error('[middleware] Failed to validate session', error);
        sessionValidation = { valid: false };
      }

      isSessionValid = sessionValidation.valid && sessionValidation.session?.userId === refreshedUser.id;
      
      if (!isSessionValid) {
        // Create new session if invalid
        let newSession: SessionRecord | null = null;
        try {
          newSession = await createSession(refreshedUser as User, {
            userAgent: request.headers.get('user-agent') || undefined,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
          });
        } catch (error) {
          console.error('[middleware] Failed to create session', error);
        }
        if (newSession) {
          response.cookies.set('app-session-id', newSession.sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_CONFIG.absoluteTimeout / 1000,
            path: '/',
          });
          isSessionValid = true;
        }
      } else if (sessionValidation.shouldRenew) {
        // Renew session asynchronously to avoid blocking
        renewSession(sessionId).catch(err => 
          console.error('Session renewal failed:', err)
        );
      }
    } else {
      // Create new session
      let newSession: SessionRecord | null = null;
      try {
        newSession = await createSession(refreshedUser as User, {
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        });
      } catch (error) {
        console.error('[middleware] Failed to create initial session', error);
      }
      if (newSession) {
        response.cookies.set('app-session-id', newSession.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: SESSION_CONFIG.absoluteTimeout / 1000,
          path: '/',
        });
        isSessionValid = true;
      }
    }
    
    // If we have a valid user and session, allow access
    if (isSessionValid) {
      return response;
    }
  }
  
  // Handle protected routes without auth
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/account')) {
    const baseUrl = request.nextUrl.origin;
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isApiRoute && !isPublicRoute(pathname)) {
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: 'Unauthorized', 
        code: 'AUTH_REQUIRED' 
      }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          ...Object.fromEntries(response.headers.entries())
        } 
      }
    );
  }
  
  // Handle root redirect
  if (pathname === '/') {
    const baseUrl = request.nextUrl.origin;
    if (!refreshedUser) {
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('from', '/');
      return NextResponse.redirect(redirectUrl);
    } else {
      const dashboardUrl = new URL('/dashboard', baseUrl);
      return NextResponse.redirect(dashboardUrl);
    }
  }
  
  // Legacy URL redirects (moved to end for performance)
  const normalizedPath = pathname.replace(/\/\.\.\//g, '/');
  if (['/brands', '/workflows', '/content', '/users'].some(prefix => normalizedPath.startsWith(prefix))) {
    const newPath = normalizedPath.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    );
    const url = new URL(newPath, request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
  }
  
  return response;
}

// Optimized matcher configuration - be more specific to reduce middleware invocations
export const config = {
  matcher: [
    // Match auth routes
    '/auth/:path*',
    '/api/auth/:path*',
    
    // Match dashboard routes
    '/dashboard/:path*',
    '/account/:path*',
    '/private-bookings',
    
    // Match API routes
    '/api/:path*',
    
    // Match root
    '/',
    
    // Match legacy redirects
    '/brands/:path*',
    '/workflows/:path*',
    '/content/:path*',
    '/users/:path*',
    
    // Exclude all static files and assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
