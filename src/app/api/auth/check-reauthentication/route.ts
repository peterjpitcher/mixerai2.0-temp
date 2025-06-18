import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { requiresReauthentication } from '@/lib/auth/session-manager';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { operation } = body;
    
    if (!operation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Operation is required',
        },
        { status: 400 }
      );
    }
    
    // Get last authentication time from user metadata or session
    // For now, we'll use the user's last sign in time
    const lastAuthTime = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : Date.now();
    
    const needsReauth = requiresReauthentication(operation, lastAuthTime);
    
    return NextResponse.json({
      success: true,
      requiresReauthentication: needsReauth,
      operation,
    });
  } catch (error) {
    console.error('Error checking re-authentication requirement:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check re-authentication requirement',
      },
      { status: 500 }
    );
  }
});