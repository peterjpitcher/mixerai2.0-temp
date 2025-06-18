import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { sessionConfig } from './session-config';

interface LoginAttempt {
  email: string;
  timestamp: number;
  ip: string;
  success: boolean;
}

// In-memory storage for login attempts
// TODO: Move to Redis for production/distributed deployments
const loginAttempts = new Map<string, LoginAttempt[]>();

// Export for testing purposes only
export const _testHelpers = {
  clearStore: () => loginAttempts.clear(),
  getStore: () => loginAttempts
};

// Cleanup old attempts periodically
setInterval(() => {
  const cutoff = Date.now() - sessionConfig.lockout.checkWindow;
  for (const [email, attempts] of loginAttempts.entries()) {
    const validAttempts = attempts.filter(a => a.timestamp > cutoff);
    if (validAttempts.length === 0) {
      loginAttempts.delete(email);
    } else {
      loginAttempts.set(email, validAttempts);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Check if an account is locked due to too many failed attempts
 */
export async function isAccountLocked(email: string): Promise<{
  locked: boolean;
  remainingTime?: number;
  attempts?: number;
}> {
  const attempts = loginAttempts.get(email.toLowerCase()) || [];
  const cutoff = Date.now() - sessionConfig.lockout.checkWindow;
  const recentAttempts = attempts.filter(a => a.timestamp > cutoff && !a.success);
  
  if (recentAttempts.length >= sessionConfig.lockout.maxAttempts) {
    const lastAttempt = Math.max(...recentAttempts.map(a => a.timestamp));
    const lockoutEnd = lastAttempt + sessionConfig.lockout.duration;
    
    if (Date.now() < lockoutEnd) {
      return {
        locked: true,
        remainingTime: Math.ceil((lockoutEnd - Date.now()) / 1000), // seconds
        attempts: recentAttempts.length
      };
    }
  }
  
  return {
    locked: false,
    attempts: recentAttempts.length
  };
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string, 
  ip: string, 
  success: boolean
): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const attempts = loginAttempts.get(normalizedEmail) || [];
  
  attempts.push({
    email: normalizedEmail,
    timestamp: Date.now(),
    ip,
    success
  });
  
  // Keep only recent attempts
  const cutoff = Date.now() - sessionConfig.lockout.checkWindow;
  const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
  
  loginAttempts.set(normalizedEmail, recentAttempts);
  
  // Log security event (in production, this would go to a security log)
  if (!success) {
    console.log(`Failed login attempt for ${email} from ${ip}`);
    
    // If this triggers a lockout, log it
    if (recentAttempts.filter(a => !a.success).length >= sessionConfig.lockout.maxAttempts) {
      console.log(`Account locked: ${email} after ${sessionConfig.lockout.maxAttempts} failed attempts`);
      await logSecurityEvent('account_locked', {
        email,
        ip,
        attempts: sessionConfig.lockout.maxAttempts
      });
    }
  }
}

/**
 * Clear login attempts for a user (e.g., after password reset)
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  loginAttempts.delete(email.toLowerCase());
}

/**
 * Record a failed login attempt (convenience wrapper for tests)
 */
export async function recordFailedAttempt(email: string, ip: string = '127.0.0.1'): Promise<{
  attempts: number;
  locked: boolean;
  remainingAttempts: number;
}> {
  await recordLoginAttempt(email, ip, false);
  const status = await isAccountLocked(email);
  
  return {
    attempts: status.attempts || 0,
    locked: status.locked,
    remainingAttempts: Math.max(0, sessionConfig.lockout.maxAttempts - (status.attempts || 0))
  };
}

/**
 * Unlock an account (alias for clearLoginAttempts)
 */
export async function unlockAccount(email: string): Promise<void> {
  await clearLoginAttempts(email);
}

/**
 * Clean up old attempts (exposed for testing)
 */
export function cleanupOldAttempts(): void {
  const cutoff = Date.now() - sessionConfig.lockout.checkWindow;
  for (const [email, attempts] of loginAttempts.entries()) {
    const validAttempts = attempts.filter(a => a.timestamp > cutoff);
    if (validAttempts.length === 0) {
      loginAttempts.delete(email);
    } else {
      loginAttempts.set(email, validAttempts);
    }
  }
}

/**
 * Log security events to the database
 */
export async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    // TODO: Uncomment when security_logs table is created and types are updated
    // const supabase = createSupabaseAdminClient();
    // 
    // await supabase.from('security_logs').insert({
    //   event_type: eventType,
    //   user_id: userId,
    //   details,
    //   ip_address: details.ip,
    //   timestamp: new Date().toISOString()
    // });
    
    // For now, log to console in production
    console.log('[SECURITY EVENT]', {
      event_type: eventType,
      user_id: userId,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Don't throw - security logging should not break the app
    console.error('Failed to log security event:', error);
  }
}