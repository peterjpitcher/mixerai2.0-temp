import { z } from 'zod';

export const NotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  contentUpdates: z.boolean().optional(),
  newComments: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

export const MISSING_IF_MATCH_ERROR = 'Missing If-Match header for concurrency control.';
export const VERSION_CONFLICT_ERROR = 'Notification settings have been modified by another session.';

export type VersionCheckResult =
  | { ok: true }
  | { ok: false; status: 412 | 428; error: string };

export function evaluateIfMatchHeader(ifMatch: string | null, currentVersion: number): VersionCheckResult {
  if (!ifMatch) {
    return { ok: false, status: 428, error: MISSING_IF_MATCH_ERROR };
  }

  if (ifMatch === '*') {
    return { ok: true };
  }

  if (ifMatch === 'null') {
    return currentVersion === 0
      ? { ok: true }
      : { ok: false, status: 412, error: VERSION_CONFLICT_ERROR };
  }

  const parsed = Number(ifMatch);
  if (!Number.isFinite(parsed) || parsed !== currentVersion) {
    return { ok: false, status: 412, error: VERSION_CONFLICT_ERROR };
  }

  return { ok: true };
}

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
