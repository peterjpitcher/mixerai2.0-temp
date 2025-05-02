import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NOTE: This middleware is currently DISABLED to avoid routing conflicts.
 * 
 * The application now uses a RootLayoutWrapper component in src/app/layout.tsx
 * to provide consistent navigation instead of relying on route groups.
 * 
 * All routes including '/users' and '/users/invite' now exist directly in
 * the src/app directory without using the (dashboard) route group.
 * 
 * For details, see docs/ROUTING_FIX.md
 */

// List of paths that should use the dashboard layout
const dashboardPaths = [
  '/',
  '/brands',
  '/content',
  '/workflows',
  '/users',
  '/account',
];

// This middleware adds security headers to all responses
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  return response;
}

// Configure paths to include in middleware processing
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 