import { z } from 'zod';

export const NotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  contentUpdates: z.boolean().optional(),
  newComments: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

export function mapProfileToSettings(profile: {
  email_notifications_enabled: boolean | null;
  email_preferences: unknown;
}) {
  const rawPrefs = profile?.email_preferences;
  const emailPrefs = rawPrefs && typeof rawPrefs === 'object' && !Array.isArray(rawPrefs)
    ? (rawPrefs as Record<string, unknown>)
    : {};

  return {
    emailNotifications: profile?.email_notifications_enabled ?? true,
    contentUpdates: emailPrefs.content_approved !== false && emailPrefs.content_rejected !== false,
    newComments: emailPrefs.comments_mentions !== false,
    taskReminders: emailPrefs.deadline_reminders === true,
    marketingEmails: emailPrefs.marketing === true,
  };
}

export function buildPreferences(settings: {
  emailNotifications: boolean;
  contentUpdates: boolean;
  newComments: boolean;
  taskReminders: boolean;
  marketingEmails: boolean;
}) {
  return {
    content_approved: settings.contentUpdates,
    content_rejected: settings.contentUpdates,
    workflow_assigned: settings.contentUpdates,
    workflow_completed: settings.contentUpdates,
    brand_invitation: true,
    weekly_summary: settings.marketingEmails,
    deadline_reminders: settings.taskReminders,
    comments_mentions: settings.newComments,
    marketing: settings.marketingEmails,
  };
}
