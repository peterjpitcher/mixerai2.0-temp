import { createSupabaseAdminClient } from '@/lib/supabase/client';

export interface CreateNotificationParams {
  user_id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
}

/**
 * Create a notification for a user
 * This should be called from server-side code only (API routes, server actions, etc.)
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      message: params.message,
      action_label: params.action_label,
      action_url: params.action_url,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }

  return data;
}

/**
 * Helper functions for common notification types
 */
export const NotificationHelpers = {
  contentApproved: (userId: string, contentTitle: string, contentId: string) => 
    createNotification({
      user_id: userId,
      type: 'success',
      title: 'Content Approved',
      message: `Your content "${contentTitle}" has been approved.`,
      action_label: 'View Content',
      action_url: `/dashboard/content/${contentId}`
    }),

  contentRejected: (userId: string, contentTitle: string, contentId: string) => 
    createNotification({
      user_id: userId,
      type: 'error',
      title: 'Content Rejected',
      message: `Your content "${contentTitle}" has been rejected.`,
      action_label: 'View Feedback',
      action_url: `/dashboard/content/${contentId}`
    }),

  reviewRequired: (userId: string, contentTitle: string, contentId: string) => 
    createNotification({
      user_id: userId,
      type: 'warning',
      title: 'Review Required',
      message: `Content "${contentTitle}" needs your review.`,
      action_label: 'Review Now',
      action_url: `/dashboard/content/${contentId}`
    }),

  workflowUpdated: (userId: string, workflowName: string, workflowId: string) => 
    createNotification({
      user_id: userId,
      type: 'info',
      title: 'Workflow Updated',
      message: `The workflow "${workflowName}" has been updated.`,
      action_label: 'View Workflow',
      action_url: `/dashboard/workflows/${workflowId}`
    }),

  userJoinedBrand: (userId: string, userName: string, brandName: string) => 
    createNotification({
      user_id: userId,
      type: 'info',
      title: 'New Team Member',
      message: `${userName} has joined ${brandName}.`
    }),

  claimReviewCompleted: (userId: string, brandName: string, countryCode: string, status: string) => 
    createNotification({
      user_id: userId,
      type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning',
      title: 'Claim Review Completed',
      message: `Claims for ${brandName} in ${countryCode} have been reviewed: ${status}.`,
      action_label: 'View Results',
      action_url: `/dashboard/claims/reviews`
    })
};