import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { clearLoginAttempts } from '@/lib/auth/account-lockout';

export const POST = withAuthAndCSRF(async (_req: NextRequest, user) => {
  const email = user.email;

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authenticated user email not available. Unable to clear lockout state.',
      },
      { status: 400 }
    );
  }

  await clearLoginAttempts(email);

  return NextResponse.json({
    success: true,
    message: 'Login attempts reset for user.',
  });
});
