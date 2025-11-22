import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email/resend';
import { taskAssignmentTemplate, workflowActionTemplate, deadlineReminderTemplate } from '@/lib/email/templates';
import { format } from 'date-fns';
import { User } from '@supabase/supabase-js'; // Assuming User type might be needed for context/logging

interface EmailNotificationRequest {
  type: 'task_assignment' | 'workflow_action' | 'deadline_reminder';
  userId?: string; // Target user for notification
  contentId?: string;
  taskId?: string;
  action?: 'approved' | 'rejected'; // For workflow_action type
  feedback?: string; // For workflow_action type
  requestUser?: User; // The user who initiated the request, if relevant for context
}

export async function sendNotificationEmail(body: EmailNotificationRequest): Promise<{ success: boolean; message: string; status: number }> {
  console.log('[sendNotificationEmail] Received notification request:', {
    type: body.type,
    userId: body.userId,
    contentId: body.contentId,
    taskId: body.taskId
  });

  if (!body.type) {
    return { success: false, message: 'Notification type is required', status: 400 };
  }

  const supabase = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mixerai.com';

  const loadRecipient = async (targetId: string | null | undefined) => {
    if (!targetId) {
      return null;
    }
    const { data: userData } = await supabase.auth.admin.getUserById(targetId);
    if (!userData?.user?.email) {
      return null;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, email_preferences')
      .eq('id', targetId)
      .maybeSingle();

    return {
      id: targetId,
      email: userData.user.email,
      name: userData.user.user_metadata?.full_name || userData.user.email.split('@')[0] || 'User',
      profile,
    } as const;
  };

  let recipient: Awaited<ReturnType<typeof loadRecipient>> = null;
  let recipientUserId: string | null = null;
  let notificationContext: { contentId?: string; taskId?: string } = {};

  try {
    switch (body.type) {
      case 'task_assignment': {
        if (!body.taskId) {
          return { success: false, message: 'Task ID required for task assignment', status: 400 };
        }

        const { data: task, error: taskError } = await supabase
          .from('user_tasks')
          .select(`
            assigned_to,
            due_date,
            content (
              title,
              brands (name),
              workflow_steps!current_step (name)
            )
          `)
          .eq('id', body.taskId)
          .single();

        type TaskRow = {
          assigned_to: string[] | string | null;
          due_date: string | null;
          content?: {
            title?: string | null;
            brands?: { name?: string | null } | null;
            workflow_steps?: { name?: string | null } | null;
            ['workflow_steps!current_step']?: { name?: string | null } | null;
          } | null;
        };

        const taskRow = taskError ? null : (task as unknown as TaskRow | null);

        if (!taskRow || !taskRow.content) {
          return { success: false, message: 'Task or content not found', status: 404 };
        }

        const assignedUsers = Array.isArray(taskRow.assigned_to)
          ? (taskRow.assigned_to as string[])
          : [];

        const targetUserId = body.userId ?? assignedUsers[0] ?? null;

        if (!targetUserId) {
          return { success: false, message: 'No assignee found for task', status: 400 };
        }

        if (assignedUsers.length && !assignedUsers.includes(targetUserId)) {
          // This case might require more granular error handling or logging depending on policy
          console.warn(`[sendNotificationEmail] User ${targetUserId} not assigned to task ${body.taskId}`);
          return { success: true, message: 'User not assigned to task, email not sent', status: 200 };
        }

        recipient = await loadRecipient(targetUserId);
        if (!recipient) {
          return { success: false, message: 'Task assignee email not found', status: 404 };
        }

        const emailPrefs = (recipient.profile?.email_preferences as Record<string, unknown>) || {};
        if (recipient.profile?.email_notifications_enabled === false || emailPrefs.workflow_assigned === false) {
          return { success: true, message: 'User has disabled workflow assignment emails', status: 200 };
        }

        const emailData = taskAssignmentTemplate({
          userName: recipient.name,
          appUrl,
          taskTitle: 'Review Content',
          contentTitle: taskRow.content?.title || 'Assigned Task',
          brandName: taskRow.content?.brands?.name || 'Unknown Brand',
          workflowStep:
            taskRow.content?.['workflow_steps!current_step']?.name || taskRow.content?.workflow_steps?.name || 'Unknown Step',
          dueDate: taskRow.due_date ? format(new Date(taskRow.due_date), 'MMM dd, yyyy') : undefined,
        });

        await sendEmail({
          to: recipient.email,
          ...emailData
        });

        recipientUserId = targetUserId;
        notificationContext = { taskId: body.taskId, contentId: body.contentId };

        break;
      }

      case 'workflow_action': {
        if (!body.contentId || !body.action) {
          return { success: false, message: 'Content ID and action required for workflow action', status: 400 };
        }

        const { data: content } = await supabase
          .from('content')
          .select(`
            title,
            created_by,
            brands (name),
            workflow_steps!current_step (name)
          `)
          .eq('id', body.contentId)
          .single();

        if (!content) {
          return { success: false, message: 'Content not found', status: 404 };
        }

        if (!content.created_by) {
          return { success: false, message: 'Content creator not found', status: 404 };
        }

        recipient = await loadRecipient(content.created_by);
        if (!recipient) {
          return { success: false, message: 'Content creator not found', status: 404 };
        }

        const emailPrefs = (recipient.profile?.email_preferences as Record<string, unknown>) || {};
        const prefKey = body.action === 'approved' ? 'content_approved' : 'content_rejected';
        if (recipient.profile?.email_notifications_enabled === false || emailPrefs[prefKey] === false) {
          return { success: true, message: `User has disabled ${body.action} emails`, status: 200 };
        }

        const reviewerName = body.requestUser?.user_metadata?.full_name || body.requestUser?.email?.split('@')[0] || 'Reviewer';

        const emailData = workflowActionTemplate({
          userName: recipient.name,
          appUrl,
          contentTitle: content.title,
          brandName: (content.brands as Record<string, unknown>)?.name as string || 'Unknown Brand',
          action: body.action,
          feedback: body.feedback,
          reviewerName,
          nextStep: body.action === 'approved' ? (content.workflow_steps as Record<string, unknown>)?.name as string : undefined
        });

        await sendEmail({
          to: recipient.email,
          ...emailData
        });

        recipientUserId = content.created_by;
        notificationContext = { contentId: body.contentId };

        break;
      }

      case 'deadline_reminder': {
        if (!body.contentId) {
          return { success: false, message: 'Content ID required for deadline reminder', status: 400 };
        }

        const targetUserId = body.userId ?? body.requestUser?.id; // Use requestUser for context if userId not provided
        if (!targetUserId) {
          return { success: false, message: 'No target user ID provided for deadline reminder', status: 400 };
        }
        // NOTE: The original API route had a check `if (targetUserId !== requestUser.id)`
        // This utility function doesn't have the context of 'requestUser' unless passed.
        // For simplicity, we'll assume the caller passes the correct userId or that check
        // is handled at the API route level if needed. If body.requestUser is passed,
        // we can add a similar check here.
        if (body.requestUser && targetUserId !== body.requestUser.id) {
          return { success: false, message: 'You can only request reminders for your own account', status: 403 };
        }


        recipient = await loadRecipient(targetUserId);
        if (!recipient) {
          return { success: false, message: 'User email not found', status: 400 };
        }

        const emailPrefs = (recipient.profile?.email_preferences as Record<string, unknown>) || {};
        if (recipient.profile?.email_notifications_enabled === false || emailPrefs.deadline_reminders === false) {
          return { success: true, message: 'User has disabled deadline reminder emails', status: 200 };
        }

        const { data: content } = await supabase
          .from('content')
          .select(`
            title,
            due_date,
            brands (name),
            workflow_steps!current_step (name)
          `)
          .eq('id', body.contentId)
          .single();

        if (!content) {
          return { success: false, message: 'Content not found', status: 404 };
        }

        if (!content.due_date) {
          return { success: false, message: 'Content has no due date set', status: 400 };
        }

        const emailData = deadlineReminderTemplate({
          userName: recipient.name,
          appUrl,
          contentTitle: content.title,
          brandName: (content.brands as Record<string, unknown>)?.name as string || 'Unknown Brand',
          workflowStep: (content.workflow_steps as Record<string, unknown>)?.name as string || 'Unknown Step',
          dueDate: format(new Date(content.due_date), 'MMM dd, yyyy')
        });

        await sendEmail({
          to: recipient.email,
          ...emailData
        });

        recipientUserId = targetUserId;
        notificationContext = { contentId: body.contentId };

        break;
      }

      default:
        return { success: false, message: 'Invalid notification type', status: 400 };
    }

    if (!recipient || !recipientUserId) {
      return { success: false, message: 'Unable to resolve notification recipient', status: 500 };
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: recipientUserId,
        title: `Email sent: ${body.type.replace('_', ' ')}`,
        message: `Email notification sent to ${recipient.email}`,
        type: 'email',
        metadata: {
          notificationType: body.type,
          ...notificationContext,
        }
      });

    return { success: true, message: 'Email notification sent successfully', status: 200 };

  } catch (error) {
    console.error('[sendNotificationEmail] Error:', error);
    // Returning a generic error message to the caller,
    // actual error details can be logged internally.
    return { success: false, message: 'Internal server error during email notification', status: 500 };
  }
}
