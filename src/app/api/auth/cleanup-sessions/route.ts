import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/auth/session-manager';

// This endpoint should be called periodically (e.g., via a cron job)
// to clean up expired sessions
export async function POST(req: NextRequest) {
  try {
    // Simple security check - in production, use a more secure method
    // like verifying a secret key or checking if request comes from an internal service
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_KEY || 'development-only-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await cleanupExpiredSessions();
    
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