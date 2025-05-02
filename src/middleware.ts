import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * This middleware adds security headers to non-API responses
 */
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// Configure paths to include in middleware processing
// Explicitly exclude API routes
export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}; 