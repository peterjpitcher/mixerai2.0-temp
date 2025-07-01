import { 
  createSession, 
  validateSession, 
  renewSession, 
  invalidateSession,
  invalidateAllUserSessions,
  cleanupExpiredSessions 
} from '@/lib/auth/session-manager';

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: jest.fn(() => 'test-session-id-' + Date.now())
} as unknown as Crypto;

describe('Session Manager', () => {
  const testUserId = 'user-123';
  
  beforeEach(() => {
    // Clear session store between tests
    // @ts-expect-error - accessing private variable for testing
    global.sessionStore = new Map();
  });

  describe('createSession', () => {
    it('should create a new session and return session ID', async () => {
      const sessionId = await createSession(testUserId);
      
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^test-session-id-/);
    });

    it('should store session with correct metadata', async () => {
      const beforeCreate = Date.now();
      const sessionId = await createSession(testUserId);
      const afterCreate = Date.now();
      
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
      expect(session.lastActivity).toBe(session.createdAt);
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const sessionId = await createSession(testUserId);
      const result = await validateSession(sessionId);
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(result.reason).toBeUndefined();
    });

    it('should reject non-existent session', async () => {
      const result = await validateSession('non-existent-session');
      
      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.reason).toBe('Session not found');
    });

    it('should reject expired session', async () => {
      const sessionId = await createSession(testUserId);
      
      // Manually expire the session
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      session.expiresAt = Date.now() - 1000;
      
      const result = await validateSession(sessionId);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should reject inactive session', async () => {
      const sessionId = await createSession(testUserId);
      
      // Set last activity to beyond idle timeout
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      session.lastActivity = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      
      const result = await validateSession(sessionId);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session idle timeout');
    });

    it('should update last activity on successful validation', async () => {
      const sessionId = await createSession(testUserId);
      
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await validateSession(sessionId);
      
      expect(session.lastActivity).toBeGreaterThan(originalActivity);
    });
  });

  describe('renewSession', () => {
    it('should extend session expiration', async () => {
      const sessionId = await createSession(testUserId);
      
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      const originalExpiry = session.expiresAt;
      
      const result = await renewSession(sessionId);
      
      expect(result.success).toBe(true);
      expect(session.expiresAt).toBeGreaterThan(originalExpiry);
    });

    it('should fail for non-existent session', async () => {
      const result = await renewSession('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should fail for expired session', async () => {
      const sessionId = await createSession(testUserId);
      
      // Expire the session
      // @ts-expect-error - accessing private store for testing
      const session = global.sessionStore.get(sessionId);
      session.expiresAt = Date.now() - 1000;
      
      const result = await renewSession(sessionId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });
  });

  describe('invalidateSession', () => {
    it('should remove session from store', async () => {
      const sessionId = await createSession(testUserId);
      
      const result = await invalidateSession(sessionId);
      
      expect(result.success).toBe(true);
      
      // @ts-expect-error - accessing private store for testing
      expect(global.sessionStore.has(sessionId)).toBe(false);
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await invalidateSession('non-existent');
      
      expect(result.success).toBe(true); // Still returns success
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should remove all sessions for a user', async () => {
      // Create multiple sessions for the same user
      const session1 = await createSession(testUserId);
      const session2 = await createSession(testUserId);
      const session3 = await createSession(testUserId);
      
      // Create session for different user
      const otherSession = await createSession('other-user');
      
      const result = await invalidateAllUserSessions(testUserId);
      
      expect(result.count).toBe(3);
      
      // @ts-expect-error - accessing private store for testing
      expect(global.sessionStore.has(session1)).toBe(false);
      expect(global.sessionStore.has(session2)).toBe(false);
      expect(global.sessionStore.has(session3)).toBe(false);
      expect(global.sessionStore.has(otherSession)).toBe(true);
    });

    it('should handle user with no sessions', async () => {
      const result = await invalidateAllUserSessions('no-sessions-user');
      
      expect(result.count).toBe(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove only expired sessions', async () => {
      const validSession = await createSession('user1');
      const expiredSession1 = await createSession('user2');
      const expiredSession2 = await createSession('user3');
      
      // Expire some sessions
      // @ts-expect-error - accessing private store for testing
      const store = global.sessionStore;
      store.get(expiredSession1).expiresAt = Date.now() - 1000;
      store.get(expiredSession2).expiresAt = Date.now() - 2000;
      
      const result = await cleanupExpiredSessions();
      
      expect(result.cleaned).toBe(2);
      expect(store.has(validSession)).toBe(true);
      expect(store.has(expiredSession1)).toBe(false);
      expect(store.has(expiredSession2)).toBe(false);
    });

    it('should handle empty session store', async () => {
      const result = await cleanupExpiredSessions();
      
      expect(result.cleaned).toBe(0);
    });
  });
});