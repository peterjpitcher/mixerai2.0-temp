/**
 * Simple in-memory session management
 * Note: This only works for single-instance deployments
 * Sessions will be lost on server restart
 */

import { User } from '@supabase/supabase-js';
import { SESSION_CONFIG } from './session-config';

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

// Cleanup function for expired sessions (called on each operation)
function cleanupExpiredSessions() {
  const now = new Date();
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
    }
  }
}

/**
 * Generate a secure session ID using Web Crypto API (Edge Runtime compatible)
 */
function generateSessionId(): string {
  try {
    // Prefer Web Crypto in Edge/runtime-safe environments
    if (typeof crypto !== 'undefined') {
      // Use randomUUID if available
      if (typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID();
      }
      // Fallback to getRandomValues to build a hex string
      if (typeof (crypto as any).getRandomValues === 'function') {
        const arr = new Uint8Array(32);
        (crypto as any).getRandomValues(arr);
        return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch {}
  // Final fallback for Node environments without Web Crypto
  try {
    // Dynamic import to avoid bundling Node's crypto in Edge
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomBytes(32).toString('hex');
  } catch {}
  // Extremely unlikely fallback (non-crypto random)
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
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
    // Cleanup expired sessions periodically
    cleanupExpiredSessions();
    
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
