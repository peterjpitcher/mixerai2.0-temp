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

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // DISABLED: Now using RootLayoutWrapper instead of route groups
  return NextResponse.next();
  
  /*
  const { pathname } = request.nextUrl;

  // Check if the current path should use the dashboard layout
  const isDashboardPath = dashboardPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Skip API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // If this is a dashboard path but not in the (dashboard) route group
  if (isDashboardPath && !pathname.startsWith('/(dashboard)')) {
    // Rewrite to the same path but with the (dashboard) layout
    const url = request.nextUrl.clone();
    url.pathname = `/(dashboard)${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
  */
} 