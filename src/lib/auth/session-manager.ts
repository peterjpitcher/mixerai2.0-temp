import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { sessionConfig } from './session-config';
import { User } from '@supabase/supabase-js';

// In-memory session store for development
// TODO: Replace with Redis or database for production
const sessionStore = new Map<string, {
  userId: string;
  lastActivity: number;
  createdAt: number;
  invalidated: boolean;
}>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Create a new session for a user
 * Note: This function should be called from middleware where cookies can be set
 */
export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  sessionStore.set(sessionId, {
    userId,
    lastActivity: now,
    createdAt: now,
    invalidated: false,
  });
  
  // Clean up old sessions for this user
  await cleanupUserSessions(userId);
  
  return sessionId;
}

/**
 * Validate a session
 */
export async function validateSession(sessionId: string): Promise<{
  valid: boolean;
  userId?: string;
  reason?: string;
}> {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }
  
  if (session.invalidated) {
    return { valid: false, reason: 'Session has been invalidated' };
  }
  
  const now = Date.now();
  
  // Check absolute timeout
  if (now - session.createdAt > sessionConfig.absoluteTimeout) {
    sessionStore.delete(sessionId);
    return { valid: false, reason: 'Session expired (absolute timeout)' };
  }
  
  // Check idle timeout
  if (now - session.lastActivity > sessionConfig.idleTimeout) {
    sessionStore.delete(sessionId);
    return { valid: false, reason: 'Session expired (idle timeout)' };
  }
  
  // Update last activity
  session.lastActivity = now;
  sessionStore.set(sessionId, session);
  
  return { valid: true, userId: session.userId };
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const session = sessionStore.get(sessionId);
  if (session) {
    session.invalidated = true;
    sessionStore.set(sessionId, session);
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      session.invalidated = true;
      sessionStore.set(sessionId, session);
    }
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (
      session.invalidated ||
      now - session.createdAt > sessionConfig.absoluteTimeout ||
      now - session.lastActivity > sessionConfig.idleTimeout
    ) {
      sessionStore.delete(sessionId);
    }
  }
}

/**
 * Clean up old sessions for a user, keeping only the most recent ones
 */
async function cleanupUserSessions(userId: string): Promise<void> {
  const userSessions: Array<[string, typeof sessionStore extends Map<string, infer V> ? V : never]> = [];
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId && !session.invalidated) {
      userSessions.push([sessionId, session]);
    }
  }
  
  // Sort by creation time, newest first
  userSessions.sort((a, b) => b[1].createdAt - a[1].createdAt);
  
  // Invalidate sessions beyond the max concurrent limit
  for (let i = sessionConfig.maxConcurrentSessions; i < userSessions.length; i++) {
    const [sessionId] = userSessions[i];
    await invalidateSession(sessionId);
  }
}

/**
 * Check if a session needs renewal
 */
export function sessionNeedsRenewal(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  if (!session || session.invalidated) {
    return false;
  }
  
  const now = Date.now();
  const timeUntilExpiry = Math.min(
    sessionConfig.absoluteTimeout - (now - session.createdAt),
    sessionConfig.idleTimeout - (now - session.lastActivity)
  );
  
  return timeUntilExpiry <= sessionConfig.renewalThreshold;
}

/**
 * Get session info for monitoring
 */
export function getSessionInfo(sessionId: string): {
  exists: boolean;
  userId?: string;
  createdAt?: Date;
  lastActivity?: Date;
  expiresAt?: Date;
  idleExpiresAt?: Date;
} {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return { exists: false };
  }
  
  return {
    exists: true,
    userId: session.userId,
    createdAt: new Date(session.createdAt),
    lastActivity: new Date(session.lastActivity),
    expiresAt: new Date(session.createdAt + sessionConfig.absoluteTimeout),
    idleExpiresAt: new Date(session.lastActivity + sessionConfig.idleTimeout),
  };
}

/**
 * Verify if an operation requires re-authentication
 */
export function requiresReauthentication(operation: string, lastAuthTime: number): boolean {
  const sensitiveOperations = [
    'change-password',
    'delete-account',
    'change-email',
    'manage-api-keys',
    'manage-billing',
    'invite-users',
    'change-permissions',
  ];
  
  if (!sensitiveOperations.includes(operation)) {
    return false;
  }
  
  const timeSinceAuth = Date.now() - lastAuthTime;
  const reauthThreshold = 15 * 60 * 1000; // 15 minutes
  
  return timeSinceAuth > reauthThreshold;
}

/**
 * Enhanced sign out function that properly invalidates sessions
 */
export async function signOut(user: User | null): Promise<void> {
  if (!user) return;
  
  // Invalidate all sessions for this user
  await invalidateUserSessions(user.id);
  
  // Sign out from Supabase
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  
  // Note: Session cookie will be cleared by the client or middleware
  
  // Log security event
  logSecurityEvent({
    event_type: 'user_logout',
    user_id: user.id,
    user_email: user.email || '',
    ip_address: '', // Would need to get from request
    user_agent: '', // Would need to get from request
    metadata: {
      method: 'manual_logout',
    },
  });
}

/**
 * Log security events (placeholder - implement based on your logging system)
 */
async function logSecurityEvent(event: {
  event_type: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  // TODO: Implement actual security event logging
  console.log('[SECURITY_EVENT]', event);
}