import { NextResponse } from 'next/server';

/**
 * Catch-all error handler for API routes
 * This prevents Vercel from serving HTML error pages for API routes
 */
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Not Found',
      statusCode: 404 
    },
    { status: 404 }
  );
}

export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;