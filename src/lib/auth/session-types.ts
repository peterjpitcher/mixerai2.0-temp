import type { User } from '@supabase/supabase-js';
import { SESSION_CONFIG } from './session-config';

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

export interface SessionRecord {
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

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionRecord;
  shouldRenew?: boolean;
  reason?: string;
}

export interface SessionStore {
  createSession(user: User, metadata?: SessionMetadata): Promise<SessionRecord | null>;
  validateSession(sessionId: string): Promise<SessionValidationResult>;
  renewSession(sessionId: string): Promise<boolean | { success: boolean }>;
  destroySession(sessionId: string): Promise<boolean | { success: boolean }>;
  destroyUserSessions(userId: string): Promise<number | { count: number }>;
  getUserSessions(userId: string): Promise<SessionRecord[]>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  cleanupExpiredSessions(): Promise<void | { cleaned: number } | number>;
}

export const SESSION_ABSOLUTE_TTL_SECONDS = Math.ceil(SESSION_CONFIG.absoluteTimeout / 1000);
