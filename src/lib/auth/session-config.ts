/**
 * Session configuration for the application
 */
export const SESSION_CONFIG = {
  // Maximum session duration regardless of activity
  absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // Session expires after this period of inactivity
  idleTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
  
  // Renew session if it will expire within this threshold
  renewalThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
  
  // Maximum concurrent sessions per user
  maxConcurrentSessions: 5,

  // Reauthentication timeout for sensitive operations
  reauthTimeout: 30 * 60 * 1000, // 30 minutes
  
  // Account lockout configuration
  lockout: {
    maxAttempts: 5, // Lock account after 5 failed attempts
    duration: 30 * 60 * 1000, // Lock for 30 minutes
    checkWindow: 15 * 60 * 1000, // Count attempts within 15 minute window
  }
} as const;

// Also export as sessionConfig for backward compatibility
export const sessionConfig = SESSION_CONFIG;

const SENSITIVE_OPERATIONS = new Set([
  'change-password',
  'delete-account',
  'change-email',
  'manage-api-keys',
  'manage-billing',
  'invite-users',
  'change-permissions',
]);

export function checkReauthenticationRequired(operation: string, lastAuthenticatedAt?: number): boolean {
  if (!SENSITIVE_OPERATIONS.has(operation)) {
    return false;
  }

  if (typeof lastAuthenticatedAt !== 'number') {
    return true;
  }

  const now = Date.now();
  if (lastAuthenticatedAt > now) {
    return false;
  }

  return now - lastAuthenticatedAt > SESSION_CONFIG.reauthTimeout;
}

/**
 * Password policy configuration
 */
export const passwordPolicy = {
  minLength: 12, // Increased from 6
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  
  // Common weak passwords to block
  commonPasswords: [
    'password123',
    'admin123',
    'qwerty123',
    'letmein123',
    'welcome123',
    'password1234',
  ]
} as const;

/**
 * Validate password against policy
 */
export function validatePassword(password: string): {
  valid: boolean;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (passwordPolicy.requireSpecialChars && 
      !new RegExp(`[${passwordPolicy.specialChars.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}]`).test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check against common passwords
  if (passwordPolicy.commonPasswords.some(common => 
    password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password is too common. Please choose a more unique password');
  }
  
  const isValid = errors.length === 0;
  return {
    valid: isValid,
    isValid,
    errors,
  };
}
