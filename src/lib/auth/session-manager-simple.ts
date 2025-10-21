/**
 * Simple in-memory session management
 * Note: This only works for single-instance deployments
 * Sessions will be lost on server restart
 */

import { User } from '@supabase/supabase-js';
import { SESSION_CONFIG } from './session-config';
import type { SessionMetadata, SessionRecord, SessionValidationResult } from './session-types';

export type Session = SessionRecord;

// In-memory session store
const sessionStore = new Map<string, Session>();
(globalThis as any).__sessionStore = sessionStore;

// Cleanup function for expired sessions (called on each operation)
function cleanupExpiredSessionsInternal() {
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
async function generateSessionId(): Promise<string> {
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
  metadata?: SessionMetadata
): Promise<Session | null> {
  try {
    // Cleanup expired sessions periodically
    cleanupExpiredSessionsInternal();
    
    const sessionId = await generateSessionId();
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
): Promise<SessionValidationResult> {
  try {
    const session = sessionStore.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    const now = new Date();
    
    // Check if session expired
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
      return { valid: false, reason: 'Session expired' };
    }
    
    // Check if session is idle too long
    const idleTime = now.getTime() - session.lastActivityAt.getTime();
    if (idleTime > SESSION_CONFIG.idleTimeout) {
      sessionStore.delete(sessionId);
      return { valid: false, reason: 'Session idle timeout' };
    }

    // Check if should renew (when close to renewal threshold)
    const shouldRenew = idleTime > SESSION_CONFIG.renewalThreshold;

    session.lastActivityAt = now;
    sessionStore.set(sessionId, session);

    return {
      valid: true,
      session,
      shouldRenew,
    };
  } catch (error) {
    console.error('Failed to validate session:', error);
    return { valid: false, reason: 'Session validation failed' };
  }
}

/**
 * Renew a session (update lastActivityAt)
 */
export async function renewSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const now = new Date();
    if (session.expiresAt.getTime() < now.getTime()) {
      sessionStore.delete(sessionId);
      return { success: false, error: 'Session expired' };
    }

    const idleTime = now.getTime() - session.lastActivityAt.getTime();
    if (idleTime > SESSION_CONFIG.idleTimeout) {
      sessionStore.delete(sessionId);
      return { success: false, error: 'Session expired' };
    }

    session.lastActivityAt = now;
    session.expiresAt = new Date(now.getTime() + SESSION_CONFIG.absoluteTimeout);
    sessionStore.set(sessionId, session);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to renew session:', error);
    return { success: false, error: 'Failed to renew session' };
  }
}

/**
 * Destroy a session
 */
export async function destroySession(sessionId: string): Promise<{ success: boolean }> {
  try {
    const deleted = sessionStore.delete(sessionId);
    return { success: deleted };
  } catch (error) {
    console.error('Failed to destroy session:', error);
    return { success: false };
  }
}

/**
 * Destroy all sessions for a user
 */
export async function destroyUserSessions(userId: string): Promise<{ success: boolean; count: number }> {
  try {
    let count = 0;
    
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId) {
        sessionStore.delete(sessionId);
        count++;
      }
    }
    
    return { success: true, count };
  } catch (error) {
    console.error('Failed to destroy user sessions:', error);
    return { success: false, count: 0 };
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

export async function getSession(sessionId: string): Promise<Session | null> {
  return sessionStore.get(sessionId) ?? null;
}

export async function cleanupExpiredSessions(): Promise<{ cleaned: number }> {
  const before = sessionStore.size;
  cleanupExpiredSessionsInternal();
  return { cleaned: Math.max(0, before - sessionStore.size) };
}

export function __getSessionStoreForTests() {
  return sessionStore;
}

export function __clearSessionsForTests() {
  sessionStore.clear();
}
