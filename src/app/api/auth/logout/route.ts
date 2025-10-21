import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { signOut } from '@/lib/auth/session-manager';

export const runtime = 'nodejs';

export const POST = withAuthAndCSRF(async (_req: NextRequest, user) => {
  try {
    // Sign out and invalidate all sessions
    await signOut(user);
    const response = NextResponse.json({
      success: true,
      message: 'Successfully signed out',
    });

    response.cookies.set({
      name: 'app-session-id',
      value: '',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sign out properly',
      },
      { status: 500 }
    );
  }
});
