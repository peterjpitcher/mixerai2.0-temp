process.env.SKIP_REDIS_WARNING = 'true';

import { User } from '@supabase/supabase-js';
import {
  createSession,
  validateSession,
  renewSession,
  destroySession,
  destroyUserSessions,
  cleanupExpiredSessions,
  getSession,
} from '@/lib/auth/session-manager';
import { __clearSessionsForTests, __getSessionStoreForTests } from '@/lib/auth/session-manager-simple';

const buildUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  email: `${id}@example.com`,
  app_metadata: { global_role: 'viewer' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
} as User);

describe('Session Manager', () => {
  const testUser = buildUser('user-123');

  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    __clearSessionsForTests();
  });

  describe('createSession', () => {
    it('should create a new session and return a record', async () => {
      const session = await createSession(testUser);

      expect(session).not.toBeNull();
      expect(session?.sessionId).toBeTruthy();
      expect(session?.userId).toBe(testUser.id);
    });

    it('should store session with correct metadata', async () => {
      const beforeCreate = Date.now();
      const created = await createSession(testUser);
      const afterCreate = Date.now();
      expect(created).not.toBeNull();

      const store = __getSessionStoreForTests();
      const stored = store.get(created!.sessionId);

      expect(stored).toBeDefined();
      expect(stored!.userId).toBe(testUser.id);
      expect(stored!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate);
      expect(stored!.createdAt.getTime()).toBeLessThanOrEqual(afterCreate);
      expect(stored!.expiresAt.getTime()).toBeGreaterThan(stored!.createdAt.getTime());
      expect(stored!.lastActivityAt.getTime()).toBe(stored!.createdAt.getTime());
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const session = await createSession(testUser);
      const result = await validateSession(session!.sessionId);
      
      expect(result.valid).toBe(true);
      expect(result.session?.userId).toBe(testUser.id);
      expect(result.reason).toBeUndefined();
    });

    it('should reject non-existent session', async () => {
      const result = await validateSession('non-existent-session');
      
      expect(result.valid).toBe(false);
      expect(result.session?.userId).toBeUndefined();
      expect(result.reason).toBe('Session not found');
    });

    it('should reject expired session', async () => {
      const session = await createSession(testUser);
      const store = __getSessionStoreForTests();
      const stored = store.get(session!.sessionId)!;
      stored.expiresAt = new Date(Date.now() - 1000);

      const result = await validateSession(session!.sessionId);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should reject inactive session', async () => {
      const session = await createSession(testUser);
      const store = __getSessionStoreForTests();
      const stored = store.get(session!.sessionId)!;
      stored.lastActivityAt = new Date(Date.now() - (31 * 60 * 1000));

      const result = await validateSession(session!.sessionId);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session idle timeout');
    });

    it('should update last activity on successful validation', async () => {
      const session = await createSession(testUser);
      const store = __getSessionStoreForTests();
      const stored = store.get(session!.sessionId)!;
      stored.lastActivityAt = new Date(Date.now() - 10_000);
      const originalActivity = stored.lastActivityAt.getTime();

      await validateSession(session!.sessionId);

      const refreshed = await getSession(session!.sessionId);
      expect(refreshed?.lastActivityAt.getTime()).toBeGreaterThan(originalActivity);
    });
  });

  describe('renewSession', () => {
    it('should extend session expiration', async () => {
      const session = await createSession(testUser);
      const store = __getSessionStoreForTests();
      const stored = store.get(session!.sessionId)!;
      await new Promise(resolve => setTimeout(resolve, 5));
      const originalExpiry = stored.expiresAt.getTime();

      const result = await renewSession(session!.sessionId);

      expect(result).toBe(true);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(originalExpiry);
    });

    it('should fail for non-existent session', async () => {
      const result = await renewSession('non-existent');
      expect(result).toBe(false);
    });

    it('should fail for expired session', async () => {
      const session = await createSession(testUser);
      const store = __getSessionStoreForTests();
      const stored = store.get(session!.sessionId)!;
      stored.expiresAt = new Date(Date.now() - 1000);

      const result = await renewSession(session!.sessionId);
      expect(result).toBe(false);
    });
  });

  describe('invalidateSession', () => {
    it('should remove session from store', async () => {
      const session = await createSession(testUser);
      const result = await destroySession(session!.sessionId);

      expect(result).toBe(true);
      expect(await getSession(session!.sessionId)).toBeNull();
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await destroySession('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should remove all sessions for a user', async () => {
      const user = buildUser('user-123');
      const otherUser = buildUser('other-user');

      const sessions = await Promise.all([
        createSession(user),
        createSession(user),
        createSession(user),
      ]);
      const other = await createSession(otherUser);

      const result = await destroyUserSessions(user.id);

      expect(result).toBe(3);
      const store = __getSessionStoreForTests();
      sessions.forEach(session => expect(store.has(session!.sessionId)).toBe(false));
      expect(store.has(other!.sessionId)).toBe(true);
    });

    it('should handle user with no sessions', async () => {
      const result = await destroyUserSessions('no-sessions-user');
      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove only expired sessions', async () => {
      const valid = await createSession(buildUser('user1'));
      const expired1 = await createSession(buildUser('user2'));
      const expired2 = await createSession(buildUser('user3'));

      const store = __getSessionStoreForTests();
      store.get(expired1!.sessionId)!.expiresAt = new Date(Date.now() - 1000);
      store.get(expired2!.sessionId)!.expiresAt = new Date(Date.now() - 2000);

      const result = await cleanupExpiredSessions();

      expect(result.cleaned).toBe(2);
      expect(store.has(valid!.sessionId)).toBe(true);
      expect(store.has(expired1!.sessionId)).toBe(false);
      expect(store.has(expired2!.sessionId)).toBe(false);
    });

    it('should handle empty session store', async () => {
      const result = await cleanupExpiredSessions();
      
      expect(result.cleaned).toBe(0);
    });
  });
});
