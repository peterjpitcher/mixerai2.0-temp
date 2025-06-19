import {
  recordFailedAttempt,
  isAccountLocked,
  unlockAccount,
  cleanupOldAttempts,
  _testHelpers
} from '@/lib/auth/account-lockout';

describe('Account Lockout', () => {
  const testEmail = 'test@example.com';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  
  beforeEach(() => {
    // Clear the attempts store between tests
    _testHelpers.clearStore();
  });

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt', async () => {
      const result = await recordFailedAttempt(testEmail);
      
      expect(result.attempts).toBe(1);
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 1);
    });

    it('should increment attempts on subsequent failures', async () => {
      await recordFailedAttempt(testEmail);
      await recordFailedAttempt(testEmail);
      const result = await recordFailedAttempt(testEmail);
      
      expect(result.attempts).toBe(3);
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 3);
    });

    it('should lock account after max attempts', async () => {
      let result;
      
      // Record MAX_ATTEMPTS - 1 failures
      for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
        result = await recordFailedAttempt(testEmail);
        expect(result.locked).toBe(false);
      }
      
      // Next attempt should lock the account
      result = await recordFailedAttempt(testEmail);
      
      expect(result.attempts).toBe(MAX_ATTEMPTS);
      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toBeDefined();
      expect(result.lockedUntil).toBeGreaterThan(Date.now());
    });

    it('should not increment attempts beyond max when locked', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(testEmail);
      }
      
      // Additional attempts should not increment counter
      const result = await recordFailedAttempt(testEmail);
      
      expect(result.attempts).toBe(MAX_ATTEMPTS);
      expect(result.locked).toBe(true);
    });

    it('should reset attempts after time window', async () => {
      // Record some attempts
      await recordFailedAttempt(testEmail);
      await recordFailedAttempt(testEmail);
      
      // Simulate old attempts by modifying the store
      const store = _testHelpers.getStore();
      const attempts = store.get(testEmail.toLowerCase());
      if (attempts) {
        // Make all attempts old (16 minutes ago)
        attempts.forEach(attempt => {
          attempt.timestamp = Date.now() - 16 * 60 * 1000;
        });
      }
      
      // New attempt should reset counter
      const result = await recordFailedAttempt(testEmail);
      
      expect(result.attempts).toBe(1);
      expect(result.locked).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('should return not locked for new account', async () => {
      const result = await isAccountLocked(testEmail);
      
      expect(result.locked).toBe(false);
      expect(result.attempts).toBe(0);
    });

    it('should return locked status for locked account', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(testEmail);
      }
      
      const result = await isAccountLocked(testEmail);
      
      expect(result.locked).toBe(true);
      expect(result.attempts).toBe(MAX_ATTEMPTS);
      expect(result.remainingTime).toBeDefined();
      expect(result.remainingTime).toBeGreaterThan(0);
      expect(result.remainingTime).toBeLessThanOrEqual(LOCKOUT_DURATION);
    });

    it('should return not locked after lockout expires', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(testEmail);
      }
      
      // Simulate expired lockout
      // @ts-expect-error - accessing private store for testing
      const attempts = global.loginAttemptsStore.get(testEmail);
      attempts.lockedUntil = Date.now() - 1000; // 1 second ago
      
      const result = await isAccountLocked(testEmail);
      
      expect(result.locked).toBe(false);
      expect(result.attempts).toBe(0); // Should be reset
    });
  });

  describe('unlockAccount', () => {
    it('should unlock a locked account', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(testEmail);
      }
      
      // Verify it's locked
      let status = await isAccountLocked(testEmail);
      expect(status.locked).toBe(true);
      
      // Unlock it
      const result = await unlockAccount(testEmail);
      expect(result.success).toBe(true);
      
      // Verify it's unlocked
      status = await isAccountLocked(testEmail);
      expect(status.locked).toBe(false);
      expect(status.attempts).toBe(0);
    });

    it('should handle unlocking non-existent account', async () => {
      const result = await unlockAccount('non-existent@example.com');
      
      expect(result.success).toBe(true); // Still returns success
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should remove old attempt records', async () => {
      // Create attempts for multiple accounts
      await recordFailedAttempt('user1@example.com');
      await recordFailedAttempt('user2@example.com');
      await recordFailedAttempt('user3@example.com');
      
      // Make some attempts old
      // @ts-expect-error - accessing private store for testing
      const store = global.loginAttemptsStore;
      
      // user1: expired lockout
      const user1 = store.get('user1@example.com');
      user1.lockedUntil = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      
      // user2: old attempts
      const user2 = store.get('user2@example.com');
      user2.attempts = [Date.now() - 2 * 60 * 60 * 1000]; // 2 hours ago
      
      const result = await cleanupOldAttempts();
      
      expect(result.cleaned).toBe(2);
      expect(store.has('user1@example.com')).toBe(false);
      expect(store.has('user2@example.com')).toBe(false);
      expect(store.has('user3@example.com')).toBe(true);
    });

    it('should keep recent attempts and active lockouts', async () => {
      // Create recent attempts
      await recordFailedAttempt(testEmail);
      
      // Create active lockout
      const lockedEmail = 'locked@example.com';
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(lockedEmail);
      }
      
      const result = await cleanupOldAttempts();
      
      expect(result.cleaned).toBe(0);
      
      // @ts-expect-error - accessing private store for testing
      const store = global.loginAttemptsStore;
      expect(store.has(testEmail)).toBe(true);
      expect(store.has(lockedEmail)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email normalization', async () => {
      const email1 = 'Test@Example.COM';
      const email2 = 'test@example.com';
      
      await recordFailedAttempt(email1);
      await recordFailedAttempt(email2);
      
      const result = await isAccountLocked(email1);
      
      // Should treat as same account (normalized)
      expect(result.attempts).toBe(2);
    });

    it('should handle concurrent attempts gracefully', async () => {
      // Simulate concurrent failed attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(recordFailedAttempt(testEmail));
      }
      
      const results = await Promise.all(promises);
      
      // Should handle race conditions properly
      const finalResult = results[results.length - 1];
      expect(finalResult.locked).toBe(true);
      expect(finalResult.attempts).toBeLessThanOrEqual(10);
    });
  });
});