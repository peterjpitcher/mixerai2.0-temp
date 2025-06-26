import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { withCSRF } from '@/lib/api/with-csrf';

export const POST = withCSRF(async (request: NextRequest): Promise<Response> => {
  try {
    const body = await request.json();
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Enhanced error info with session context
    const errorLog = {
      ...body,
      sessionUserId: user?.id,
      sessionEmail: user?.email,
      reportedAt: new Date().toISOString(),
    };
    
    // In production, send to error tracking service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: await sendToSentry(errorLog);
      // Example: await sendToLogRocket(errorLog);
      console.error('[Production Error]', errorLog);
    } else {
      console.error('[Development Error]', errorLog);
    }
    
    // Optionally store critical errors in database
    if (errorLog.digest) {
      // Could store in a database table for internal tracking
      // await supabase.from('error_logs').insert(errorLog);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Error tracked successfully' 
    });
  } catch (error) {
    console.error('Failed to track error:', error);
    // Don't throw - we don't want error tracking to cause more errors
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to track error' 
    }, { status: 500 });
  }
});