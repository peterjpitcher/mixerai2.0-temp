import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, user) => {
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Analyze API is working' });
}); 
