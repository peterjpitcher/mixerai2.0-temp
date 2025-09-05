/**
 * Simple in-memory session management
 * Note: This only works for single-instance deployments
 * Sessions will be lost on server restart
 */

import { User } from '@supabase/supabase-js';
import { SESSION_CONFIG } from './session-config';
import { randomBytes } from 'crypto';

export interface Session {
  sessionId: string;
  userId: string;
  userEmail: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

// In-memory session store
const sessionStore = new Map<string, Session>();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session
 */
export async function createSession(
  user: User,
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    [key: string]: unknown;
  }
): Promise<Session | null> {
  try {
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_CONFIG.absoluteTimeout);
    
    const session: Session = {
      sessionId,
      userId: user.id,
      userEmail: user.email || '',
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      metadata,
    };
    
    sessionStore.set(sessionId, session);
    
    return session;
  } catch (error) {
    console.error('Failed to create session:', error);
    return null;
  }
}

/**
 * Validate an existing session
 */
export async function validateSession(
  sessionId: string
): Promise<{
  valid: boolean;
  session?: Session;
  shouldRenew?: boolean;
}> {
  try {
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      return { valid: false };
    }
    
    const now = new Date();
    
    // Check if session expired
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
      return { valid: false };
    }
    
    // Check if session is idle too long
    const idleTime = now.getTime() - session.lastActivityAt.getTime();
    if (idleTime > SESSION_CONFIG.idleTimeout) {
      sessionStore.delete(sessionId);
      return { valid: false };
    }
    
    // Check if should renew (when close to renewal threshold)
    const shouldRenew = idleTime > SESSION_CONFIG.renewalThreshold;
    
    return {
      valid: true,
      session,
      shouldRenew,
    };
  } catch (error) {
    console.error('Failed to validate session:', error);
    return { valid: false };
  }
}

/**
 * Renew a session (update lastActivityAt)
 */
export async function renewSession(sessionId: string): Promise<boolean> {
  try {
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    session.lastActivityAt = new Date();
    sessionStore.set(sessionId, session);
    
    return true;
  } catch (error) {
    console.error('Failed to renew session:', error);
    return false;
  }
}

/**
 * Destroy a session
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  try {
    return sessionStore.delete(sessionId);
  } catch (error) {
    console.error('Failed to destroy session:', error);
    return false;
  }
}

/**
 * Destroy all sessions for a user
 */
export async function destroyUserSessions(userId: string): Promise<number> {
  try {
    let count = 0;
    
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId) {
        sessionStore.delete(sessionId);
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('Failed to destroy user sessions:', error);
    return 0;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  try {
    const sessions: Session[] = [];
    const now = new Date();
    
    for (const session of sessionStore.values()) {
      if (session.userId === userId && session.expiresAt > now) {
        sessions.push(session);
      }
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
}