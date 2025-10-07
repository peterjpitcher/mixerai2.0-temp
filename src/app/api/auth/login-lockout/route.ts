import { NextRequest, NextResponse } from 'next/server';
import { withCSRF } from '@/lib/api/with-csrf';
import { isAccountLocked, recordLoginAttempt } from '@/lib/auth/account-lockout';
import { getIPFromHeaders } from '@/lib/utils/get-client-ip';

interface LockoutRequestBody {
  email?: string;
  action?: 'status' | 'record';
  success?: boolean;
}

export const POST = withCSRF(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as LockoutRequestBody;
  const email = body.email?.trim()?.toLowerCase();
  const action = body.action ?? 'status';

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  if (!['status', 'record'].includes(action)) {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'status') {
    const status = await isAccountLocked(email);
    return NextResponse.json({ success: true, status });
  }

  const ipAddress = getIPFromHeaders(req.headers);
  const status = await recordLoginAttempt(email, ipAddress, Boolean(body.success));

  return NextResponse.json({ success: true, status });
});
