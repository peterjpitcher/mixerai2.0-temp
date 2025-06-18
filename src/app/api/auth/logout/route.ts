import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { signOut } from '@/lib/auth/session-manager';

export const POST = withAuth(async (_req: NextRequest, user) => {
  try {
    // Sign out and invalidate all sessions
    await signOut(user);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully signed out',
    });
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