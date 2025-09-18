import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { requiresReauthentication } from '@/lib/auth/session-manager';
import { validateSession } from '@/lib/auth/session-manager-simple';

export const POST = withAuthAndCSRF(async (req: NextRequest, user) => {
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
    
    let lastAuthTime = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : Date.now();

    try {
      const sessionId = cookies().get('app-session-id')?.value;
      if (sessionId) {
        const sessionValidation = await validateSession(sessionId);
        if (sessionValidation.valid && sessionValidation.session) {
          lastAuthTime = sessionValidation.session.lastActivityAt.getTime();
        }
      }
    } catch (sessionError) {
      console.warn('[auth/check-reauthentication] Failed to inspect session info', sessionError);
    }
    
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
