import { NextResponse } from 'next/server';

/**
 * Custom error handler for API routes
 * This ensures that all API errors return JSON responses
 * instead of HTML error pages in production
 */
export default function ApiError() {
  return null; // API routes should not render anything
}

export function generateStaticParams() {
  return [];
}

// Override the default error handling for API routes
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'An error occurred', 
      statusCode: 500 
    },
    { status: 500 }
  );
}

// Export error handler for all HTTP methods
export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;