import { NextRequest, NextResponse } from 'next/server';

/**
 * Global API error handler
 * This route should never be called directly, but can be used
 * to ensure consistent error responses
 */
export async function GET(request: NextRequest) {
  const status = parseInt(request.nextUrl.searchParams.get('status') || '500');
  const message = request.nextUrl.searchParams.get('message') || 'Internal Server Error';
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      status: status
    },
    { 
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}