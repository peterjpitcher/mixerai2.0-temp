import { NextResponse } from 'next/server';

import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = 'force-dynamic';

export const GET = withAuthAndCSRF(async () => {
  return NextResponse.json(
    {
      success: false,
      error: 'The claims analyze endpoint has been retired. Use claims insights tooling instead.',
    },
    { status: 410 }
  );
}); 
