/**
 * Redis-based Session Management
 * 
 * Replaces in-memory Map storage with distributed Redis storage
 * for proper session management across serverless instances.
 */

import { SessionStore, isRedisAvailable } from '@/lib/redis/client';
import { SESSION_CONFIG } from './session-config';
import type { User } from '@supabase/supabase-js';

export interface SessionData {
  sessionId: string;
  userId: string;
  email?: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new session
 */
export async function createSession(
  user: User,
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    [key: string]: any;
  }
): Promise<SessionData | null> {
  if (!isRedisAvailable()) {
    console.warn('Redis not available for session management');
    return null;
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  
  const sessionData: SessionData = {
    sessionId,
    userId: user.id,
    email: user.email,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_CONFIG.absoluteTimeout,
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress,
    metadata,
  };

  // Store session in Redis with TTL
  const stored = await SessionStore.set(
    sessionId,
    sessionData,
    Math.floor(SESSION_CONFIG.absoluteTimeout / 1000)
  );

  if (stored) {
    // Track session for user
    await SessionStore.addUserSession(user.id, sessionId);
    
    // Enforce max concurrent sessions
    await enforceMaxSessions(user.id);
    
    return sessionData;
  }

  return null;
}

/**
 * Validate an existing session
 */
export async function validateSession(
  sessionId: string
): Promise<{ valid: boolean; session?: SessionData; shouldRenew?: boolean }> {
  if (!sessionId || !isRedisAvailable()) {
    return { valid: false };
  }

  const session = await SessionStore.get(sessionId) as SessionData;
  
  if (!session) {
    return { valid: false };
  }

  const now = Date.now();
  
  // Check absolute timeout
  if (now > session.expiresAt) {
    await invalidateSession(sessionId);
    return { valid: false };
  }
  
  // Check idle timeout
  const idleTime = now - session.lastActivity;
  if (idleTime > SESSION_CONFIG.idleTimeout) {
    await invalidateSession(sessionId);
    return { valid: false };
  }
  
  // Update last activity
  session.lastActivity = now;
  await SessionStore.set(
    sessionId,
    session,
    Math.floor((session.expiresAt - now) / 1000)
  );
  
  // Check if renewal is needed
  const timeUntilExpiry = session.expiresAt - now;
  const shouldRenew = timeUntilExpiry < SESSION_CONFIG.renewalThreshold;
  
  return {
    valid: true,
    session,
    shouldRenew,
  };
}

/**
 * Renew a session
 */
export async function renewSession(sessionId: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const session = await SessionStore.get(sessionId) as SessionData;
  
  if (!session) {
    return false;
  }
  
  const now = Date.now();
  
  // Extend expiration time
  session.expiresAt = now + SESSION_CONFIG.absoluteTimeout;
  session.lastActivity = now;
  
  return await SessionStore.set(
    sessionId,
    session,
    Math.floor(SESSION_CONFIG.absoluteTimeout / 1000)
  );
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(sessionId: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const session = await SessionStore.get(sessionId) as SessionData;
  
  if (session) {
    // Remove from user's session list
    await SessionStore.removeUserSession(session.userId, sessionId);
  }
  
  // Delete the session
  return await SessionStore.delete(sessionId);
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<number> {
  if (!isRedisAvailable()) {
    return 0;
  }

  const sessionIds = await SessionStore.getUserSessions(userId);
  let invalidated = 0;
  
  for (const sessionId of sessionIds) {
    if (await SessionStore.delete(sessionId)) {
      invalidated++;
    }
    await SessionStore.removeUserSession(userId, sessionId);
  }
  
  return invalidated;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  if (!isRedisAvailable()) {
    return [];
  }

  const sessionIds = await SessionStore.getUserSessions(userId);
  const sessions: SessionData[] = [];
  
  for (const sessionId of sessionIds) {
    const session = await SessionStore.get(sessionId) as SessionData;
    if (session) {
      // Validate session is still active
      const validation = await validateSession(sessionId);
      if (validation.valid && validation.session) {
        sessions.push(validation.session);
      }
    }
  }
  
  return sessions;
}

/**
 * Enforce maximum concurrent sessions per user
 */
async function enforceMaxSessions(userId: string): Promise<void> {
  const sessions = await getUserSessions(userId);
  
  if (sessions.length <= SESSION_CONFIG.maxConcurrentSessions) {
    return;
  }
  
  // Sort by last activity (oldest first)
  sessions.sort((a, b) => a.lastActivity - b.lastActivity);
  
  // Remove oldest sessions
  const toRemove = sessions.length - SESSION_CONFIG.maxConcurrentSessions;
  for (let i = 0; i < toRemove; i++) {
    await invalidateSession(sessions[i].sessionId);
  }
}

/**
 * Touch a session to update its last activity time
 */
export async function touchSession(sessionId: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const session = await SessionStore.get(sessionId) as SessionData;
  
  if (!session) {
    return false;
  }
  
  session.lastActivity = Date.now();
  
  return await SessionStore.set(
    sessionId,
    session,
    Math.floor((session.expiresAt - Date.now()) / 1000)
  );
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStats(): Promise<{
  totalSessions: number;
  userCount: number;
  avgSessionAge: number;
}> {
  if (!isRedisAvailable()) {
    return {
      totalSessions: 0,
      userCount: 0,
      avgSessionAge: 0,
    };
  }

  // This would require scanning Redis keys, which is expensive
  // In production, consider using Redis scan command with cursor
  // For now, return placeholder
  return {
    totalSessions: 0,
    userCount: 0,
    avgSessionAge: 0,
  };
}

/**
 * Check if session management is available
 */
export function isSessionManagementAvailable(): boolean {
  return isRedisAvailable();
}