import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { sessionConfig } from './session-config';
import type {
  SessionMetadata,
  SessionRecord,
  SessionStore,
  SessionValidationResult,
} from './session-types';
import * as memoryStore from './session-manager-simple';
import redisSessionStore, { isRedisSessionStoreAvailable } from './session-manager-redis';

const SESSION_WARNING_PRINTED = Symbol.for('__SESSION_MANAGER_WARNING_PRINTED__');
const globalSymbols = globalThis as unknown as Record<symbol, unknown>;

function getSessionStore(): SessionStore {
  if (isRedisSessionStoreAvailable()) {
    return redisSessionStore;
  }

  const runningInProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const allowInMemoryFallback = process.env.ALLOW_IN_MEMORY_SESSION_FALLBACK === 'true';

  if (runningInProduction && !allowInMemoryFallback) {
    throw new Error(
      '[session-manager] Redis session store is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or provide compatible redis credentials) before deploying to production, or explicitly acknowledge the risk by setting ALLOW_IN_MEMORY_SESSION_FALLBACK=true.'
    );
  }

  if (!globalSymbols[SESSION_WARNING_PRINTED] && process.env.SKIP_REDIS_WARNING !== 'true') {
    console.warn('[session-manager] Redis configuration missing. Falling back to in-memory sessions. This is unsafe for production.');
    globalSymbols[SESSION_WARNING_PRINTED] = true;
  }

  return {
    createSession: memoryStore.createSession,
    validateSession: memoryStore.validateSession,
    renewSession: memoryStore.renewSession,
    destroySession: memoryStore.destroySession,
    destroyUserSessions: memoryStore.destroyUserSessions,
    getUserSessions: memoryStore.getUserSessions,
    getSession: memoryStore.getSession,
    cleanupExpiredSessions: memoryStore.cleanupExpiredSessions,
  } satisfies SessionStore;
}

const store = getSessionStore();

export type { SessionMetadata, SessionRecord, SessionValidationResult } from './session-types';

export async function createSession(user: User, metadata?: SessionMetadata): Promise<SessionRecord | null> {
  return store.createSession(user, metadata);
}

export async function validateSession(sessionId: string): Promise<SessionValidationResult> {
  return store.validateSession(sessionId);
}

export async function renewSession(sessionId: string): Promise<boolean> {
  const result = await store.renewSession(sessionId);
  return typeof result === 'boolean' ? result : result.success;
}

export async function destroySession(sessionId: string): Promise<boolean> {
  const result = await store.destroySession(sessionId);
  return typeof result === 'boolean' ? result : result.success;
}

export async function destroyUserSessions(userId: string): Promise<number> {
  const result = await store.destroyUserSessions(userId);
  if (typeof result === 'number') return result;
  return result.count;
}

export async function getUserSessions(userId: string): Promise<SessionRecord[]> {
  return store.getUserSessions(userId);
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  return store.getSession(sessionId);
}

export async function cleanupExpiredSessions(): Promise<{ cleaned: number }> {
  const result = await store.cleanupExpiredSessions();
  if (!result || typeof result === 'number') {
    return { cleaned: typeof result === 'number' ? result : 0 };
  }
  return result;
}

export async function sessionNeedsRenewal(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  const now = Date.now();
  const timeUntilAbsoluteExpiry = session.expiresAt.getTime() - now;
  const timeUntilIdleExpiry = session.lastActivityAt.getTime() + sessionConfig.idleTimeout - now;
  const timeUntilExpiry = Math.min(timeUntilAbsoluteExpiry, timeUntilIdleExpiry);
  return timeUntilExpiry <= sessionConfig.renewalThreshold;
}

export async function getSessionInfo(sessionId: string): Promise<{
  exists: boolean;
  userId?: string;
  createdAt?: Date;
  lastActivity?: Date;
  expiresAt?: Date;
  idleExpiresAt?: Date;
}> {
  const session = await getSession(sessionId);
  if (!session) {
    return { exists: false };
  }
  return {
    exists: true,
    userId: session.userId,
    createdAt: session.createdAt,
    lastActivity: session.lastActivityAt,
    expiresAt: session.expiresAt,
    idleExpiresAt: new Date(session.lastActivityAt.getTime() + sessionConfig.idleTimeout),
  };
}

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

export async function signOut(user: User | null): Promise<void> {
  if (!user) return;

  await destroyUserSessions(user.id);

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  logSecurityEvent({
    event_type: 'user_logout',
    user_id: user.id,
    user_email: user.email || '',
    ip_address: '',
    user_agent: '',
    metadata: {
      method: 'manual_logout',
    },
  });
}

async function logSecurityEvent(event: {
  event_type: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  console.log('[SECURITY_EVENT]', event);
}

export { sessionConfig };
