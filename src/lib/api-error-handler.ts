import { NextResponse } from 'next/server';

/**
 * Ensures API error responses are always JSON to prevent Vercel HTML error pages
 * Use status codes that Vercel is less likely to intercept
 */
export function createApiErrorResponse(
  error: string | { message: string; code?: string },
  statusCode: number = 500
): NextResponse {
  // Convert 403 to 401 for API routes to avoid Vercel interception
  // Both mean "access denied" but Vercel is less likely to intercept 401
  const safeStatusCode = statusCode === 403 ? 401 : statusCode;
  
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = typeof error === 'object' && error.code ? error.code : undefined;
  
  const responseBody = {
    success: false,
    error: errorMessage,
    ...(errorCode && { code: errorCode }),
    timestamp: new Date().toISOString(),
  };
  
  return new NextResponse(
    JSON.stringify(responseBody),
    {
      status: safeStatusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}

/**
 * Wraps API route handlers to ensure errors always return JSON
 */
export function withJsonErrors<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[API Error]:', error);
      
      if (error instanceof NextResponse) {
        return error;
      }
      
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return createApiErrorResponse(message, 500);
    }
  }) as T;
}