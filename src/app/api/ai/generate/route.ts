import { NextResponse } from 'next/server';

import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = 'force-dynamic';

export const POST = withAuthAndCSRF(async () => {
  return NextResponse.json(
    {
      success: false,
      error:
        'This endpoint has been retired. Please use the content generation APIs under /api/content instead.',
    },
    { status: 410 }
  );
});
