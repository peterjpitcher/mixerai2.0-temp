import {
  buildPreferences,
  mapProfileToSettings,
  evaluateIfMatchHeader,
  MISSING_IF_MATCH_ERROR,
  VERSION_CONFLICT_ERROR,
} from '../notification-settings/helpers';

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

  describe('evaluateIfMatchHeader', () => {
    it('rejects missing headers', () => {
      const result = evaluateIfMatchHeader(null, 0);
      expect(result).toEqual({ ok: false, status: 428, error: MISSING_IF_MATCH_ERROR });
    });

    it('allows wildcard headers', () => {
      const result = evaluateIfMatchHeader('*', 3);
      expect(result).toEqual({ ok: true });
    });

    it('allows null header when there is no existing version', () => {
      const result = evaluateIfMatchHeader('null', 0);
      expect(result).toEqual({ ok: true });
    });

    it('rejects mismatched numeric versions', () => {
      const result = evaluateIfMatchHeader('7', 4);
      expect(result).toEqual({ ok: false, status: 412, error: VERSION_CONFLICT_ERROR });
    });

    it('rejects invalid version tokens', () => {
      const result = evaluateIfMatchHeader('abc', 1);
      expect(result).toEqual({ ok: false, status: 412, error: VERSION_CONFLICT_ERROR });
    });
  });
});
