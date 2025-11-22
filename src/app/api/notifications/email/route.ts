import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { sendNotificationEmail } from '@/lib/notifications/send-notification-email';

export const dynamic = "force-dynamic";

interface EmailNotificationRequest {
  type: 'task_assignment' | 'workflow_action' | 'deadline_reminder';
  userId?: string;
  contentId?: string;
  taskId?: string;
  action?: 'approved' | 'rejected';
  feedback?: string;
}

export const POST = withAuthAndCSRF(async function (request: NextRequest, requestUser: User) {
  try {
    const body: EmailNotificationRequest = await request.json();
    const result = await sendNotificationEmail({ ...body, requestUser });

    if (!result.success && result.status === 500) {
      // Re-throw generic error to be caught by handleApiError
      throw new Error(result.message);
    }
    
    return NextResponse.json({ success: result.success, message: result.message }, { status: result.status });
  } catch (error) {
    console.error('Email notification error:', error);
    return handleApiError(error, 'Failed to send email notification');
  }
});
