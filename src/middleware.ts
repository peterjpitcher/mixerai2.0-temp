import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * This middleware adds security headers to all responses
 * It's been simplified to avoid routing conflicts
 */
export function middleware(request: NextRequest) {
  // Skip API routes to prevent interference with their error handling
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
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
    // Apply to all routes except API, static assets, images, and favicon
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}; 