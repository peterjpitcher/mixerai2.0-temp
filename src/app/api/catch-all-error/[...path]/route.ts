import { NextRequest, NextResponse } from 'next/server';

function respond(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const method = request.method;
  const pathname = request.nextUrl?.pathname ?? 'unknown';

  console.warn('[api.catch-all] Unmatched API route', {
    requestId,
    method,
    pathname,
  });

  return NextResponse.json(
    {
      success: false,
      error: 'Not Found',
      requestId,
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function GET(request: NextRequest) {
  return respond(request);
}

export const POST = respond;
export const PUT = respond;
export const DELETE = respond;
export const PATCH = respond;
