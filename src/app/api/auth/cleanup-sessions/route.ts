import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/auth/session-manager';

let lastCleanupRun = 0;
const MIN_INTERVAL_MS = 60_000; // 1 minute throttle

// This endpoint should be called periodically (e.g., via a cron job)
// to clean up expired sessions
export async function POST(req: NextRequest) {
  try {
    // Security check - ensure proper authorization
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_KEY;
    
    // In production, require a proper internal API key
    if (process.env.NODE_ENV === 'production' && !expectedToken) {
      console.error('INTERNAL_API_KEY not configured for session cleanup endpoint');
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }
    
    // Verify the authorization token
    const providedToken = authHeader?.replace('Bearer ', '');
    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const now = Date.now();
    if (now - lastCleanupRun < MIN_INTERVAL_MS) {
      return NextResponse.json(
        { success: false, error: 'Cleanup already executed recently' },
        { status: 429 }
      );
    }

    await cleanupExpiredSessions();
    lastCleanupRun = now;
    
    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed',
    });
  } catch (error) {
    console.error('Error during session cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup sessions',
      },
      { status: 500 }
    );
  }
}
