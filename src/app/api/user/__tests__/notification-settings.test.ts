import { buildPreferences, mapProfileToSettings } from '../notification-settings/helpers';

describe('notification settings helpers', () => {
  it('maps profile rows into UI-friendly defaults', () => {
    const settings = mapProfileToSettings({
      email_notifications_enabled: null,
      email_preferences: {
        content_approved: false,
        content_rejected: false,
        comments_mentions: false,
        deadline_reminders: true,
        marketing: true,
      },
    });

    expect(settings).toEqual({
      emailNotifications: true,
      contentUpdates: false,
      newComments: false,
      taskReminders: true,
      marketingEmails: true,
    });
  });

  it('builds preferences payloads aligned with UI values', () => {
    const prefs = buildPreferences({
      emailNotifications: false,
      contentUpdates: false,
      newComments: true,
      taskReminders: true,
      marketingEmails: false,
    });

    expect(prefs).toMatchObject({
      content_approved: false,
      content_rejected: false,
      comments_mentions: true,
      deadline_reminders: true,
      marketing: false,
    });
    expect(prefs.workflow_assigned).toBe(false);
    expect(prefs.workflow_completed).toBe(false);
  });
});
