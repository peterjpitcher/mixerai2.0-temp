import { 
  validatePassword, 
  passwordPolicy,
  sessionConfig,
  checkReauthenticationRequired
} from '@/lib/auth/session-config';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'MySecure123!Pass',
        'ComplexP@ssw0rd',
        'AnotherGood#Pass123',
        'Super$ecure2024!',
        'Test123!@#Password'
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject passwords shorter than minimum length', () => {
      const result = validatePassword('Short1!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Password must be at least ${passwordPolicy.minLength} characters long`);
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123!pass');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!PASS');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbersHere!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecialChars123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return all applicable errors', () => {
      const result = validatePassword('short');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4); // Missing: length, uppercase, number, special char
      expect(result.errors).toContain(`Password must be at least ${passwordPolicy.minLength} characters long`);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should handle empty password', () => {
      const result = validatePassword('');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle passwords with unicode characters', () => {
      const result = validatePassword('Unicode123!Pāss');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      specialChars.split('').forEach(char => {
        const password = `TestPass123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject passwords that include common weak patterns', () => {
      const result = validatePassword('Password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a more unique password');
    });
  });

  describe('checkReauthenticationRequired', () => {
    const sensitiveOperations = [
      'change-password',
      'delete-account',
      'change-email',
      'manage-api-keys'
    ];

    const normalOperations = [
      'update-profile',
      'change-theme',
      'view-settings'
    ];

    it('should require reauthentication for sensitive operations', () => {
      // Set last auth to 40 minutes ago
      const lastAuth = Date.now() - (40 * 60 * 1000);
      
      sensitiveOperations.forEach(operation => {
        const result = checkReauthenticationRequired(operation, lastAuth);
        expect(result).toBe(true);
      });
    });

    it('should not require reauthentication for recent auth', () => {
      // Set last auth to 5 minutes ago
      const lastAuth = Date.now() - (5 * 60 * 1000);
      
      sensitiveOperations.forEach(operation => {
        const result = checkReauthenticationRequired(operation, lastAuth);
        expect(result).toBe(false);
      });
    });

    it('should not require reauthentication for non-sensitive operations', () => {
      // Even with old auth
      const lastAuth = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      
      normalOperations.forEach(operation => {
        const result = checkReauthenticationRequired(operation, lastAuth);
        expect(result).toBe(false);
      });
    });

    it('should handle edge case of exactly 30 minutes', () => {
      const lastAuth = Date.now() - (30 * 60 * 1000);
      
      const result = checkReauthenticationRequired('change-password', lastAuth);
      expect(result).toBe(false); // Exactly at threshold should not require
    });

    it('should handle missing lastAuth timestamp', () => {
      const result = checkReauthenticationRequired('change-password', undefined);
      expect(result).toBe(true); // Should require reauth if no timestamp
    });

    it('should handle future timestamps gracefully', () => {
      const futureAuth = Date.now() + (10 * 60 * 1000); // 10 minutes in future
      
      const result = checkReauthenticationRequired('change-password', futureAuth);
      expect(result).toBe(false); // Should treat as recent auth
    });
  });

  describe('Session Configuration', () => {
    it('should have correct session timeout values', () => {
      expect(sessionConfig.absoluteTimeout).toBe(24 * 60 * 60 * 1000);
      expect(sessionConfig.idleTimeout).toBe(30 * 60 * 1000);
      expect(sessionConfig.renewalThreshold).toBe(5 * 60 * 1000);
    });

    it('should have reauth timeout less than idle timeout', () => {
      expect(sessionConfig.reauthTimeout).toBe(30 * 60 * 1000);
    });
  });

  describe('Password Policy Configuration', () => {
    it('should have secure password requirements', () => {
      expect(passwordPolicy.minLength).toBeGreaterThanOrEqual(12);
      expect(passwordPolicy.requireUppercase).toBe(true);
      expect(passwordPolicy.requireLowercase).toBe(true);
      expect(passwordPolicy.requireNumbers).toBe(true);
      expect(passwordPolicy.requireSpecialChars).toBe(true);
    });
  });
});
