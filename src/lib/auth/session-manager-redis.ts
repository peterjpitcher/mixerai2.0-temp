import { SESSION_CONFIG } from './session-config';
import type { SessionRecord, SessionStore, SessionMetadata, SessionValidationResult } from './session-types';
import type { User } from '@supabase/supabase-js';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SESSION_KEY_PREFIX = 'session:';
const USER_SESSIONS_KEY_PREFIX = 'user:';
const USER_SESSIONS_SUFFIX = ':sessions';

const hasRedisConfig = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

type SerializedSession = {
  sessionId: string;
  userId: string;
  userEmail: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
};

type RedisPipelineCommand = string[];

type RedisPipelineResult = Array<{ result: unknown }>;

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function userSessionsKey(userId: string): string {
  return `${USER_SESSIONS_KEY_PREFIX}${userId}${USER_SESSIONS_SUFFIX}`;
}

function serializeSession(session: SessionRecord): SerializedSession {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    userEmail: session.userEmail,
    createdAt: session.createdAt.getTime(),
    expiresAt: session.expiresAt.getTime(),
    lastActivityAt: session.lastActivityAt.getTime(),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    metadata: session.metadata,
  };
}

function deserializeSession(payload: SerializedSession | null | undefined): SessionRecord | null {
  if (!payload) return null;
  return {
    sessionId: payload.sessionId,
    userId: payload.userId,
    userEmail: payload.userEmail,
    createdAt: new Date(payload.createdAt),
    expiresAt: new Date(payload.expiresAt),
    lastActivityAt: new Date(payload.lastActivityAt),
    userAgent: payload.userAgent,
    ipAddress: payload.ipAddress,
    metadata: payload.metadata,
  };
}

async function redisPipeline(commands: RedisPipelineCommand[]): Promise<RedisPipelineResult> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Redis REST credentials not configured');
  }

  const response = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redis pipeline error (${response.status}): ${text}`);
  }

  return (await response.json()) as RedisPipelineResult;
}

async function redisGet(key: string): Promise<string | null> {
  const [result] = await redisPipeline([[ 'GET', key ]]);
  return (result?.result as string | null) ?? null;
}

async function redisSet(key: string, value: string, ttlMs: number): Promise<void> {
  await redisPipeline([[ 'SET', key, value, 'PX', Math.max(ttlMs, 1000).toString() ]]);
}

async function redisDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  await redisPipeline([[ 'DEL', ...keys ]]);
}

async function redisSRem(key: string, ...members: string[]): Promise<void> {
  if (!members.length) return;
  await redisPipeline([[ 'SREM', key, ...members ]]);
}

async function redisSMembers(key: string): Promise<string[]> {
  const [result] = await redisPipeline([[ 'SMEMBERS', key ]]);
  const members = result?.result as string[] | null;
  return Array.isArray(members) ? members : [];
}

async function redisExpire(key: string, ttlMs: number): Promise<void> {
  await redisPipeline([[ 'PEXPIRE', key, Math.max(ttlMs, 1000).toString() ]]);
}

async function redisScan(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [result] = await redisPipeline([[ 'SCAN', cursor, 'MATCH', pattern, 'COUNT', '100' ]]);
    const raw = result?.result as [string, string[]] | undefined;
    const nextCursor = raw?.[0] ?? '0';
    const found = Array.isArray(raw?.[1]) ? raw![1] : [];
    keys.push(...found);
    cursor = nextCursor;
  } while (cursor !== '0');

  return keys;
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function buildSessionRecord(user: User, metadata?: SessionMetadata): SessionRecord {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.absoluteTimeout);
  return {
    sessionId: generateSessionId(),
    userId: user.id,
    userEmail: user.email || '',
    createdAt: now,
    expiresAt,
    lastActivityAt: now,
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress,
    metadata,
  };
}

async function enforceConcurrentSessionLimit(userId: string): Promise<void> {
  const memberIds = await redisSMembers(userSessionsKey(userId));
  if (memberIds.length <= SESSION_CONFIG.maxConcurrentSessions) {
    return;
  }

  const sessions = await Promise.all(memberIds.map(async (id) => ({
    id,
    session: await getSession(id),
  })));

  const validSessions = sessions
    .map(({ id, session }) => ({ id, session }))
    .filter((entry): entry is { id: string; session: SessionRecord } => Boolean(entry.session));

  validSessions.sort((a, b) => b.session.createdAt.getTime() - a.session.createdAt.getTime());

  const sessionsToKeep = validSessions.slice(0, SESSION_CONFIG.maxConcurrentSessions).map((entry) => entry.id);
  const sessionsToRemove = validSessions.slice(SESSION_CONFIG.maxConcurrentSessions).map((entry) => entry.id);

  const removalPromises = sessionsToRemove.map(async (sessionId) => {
    await redisDel(sessionKey(sessionId));
    await redisSRem(userSessionsKey(userId), sessionId);
  });

  await Promise.all(removalPromises);

  // Clean up any stale ids (e.g., sessions that no longer exist)
  const staleIds = memberIds.filter((id) => !sessionsToKeep.includes(id) && !sessionsToRemove.includes(id));
  if (staleIds.length) {
    await redisSRem(userSessionsKey(userId), ...staleIds);
  }
}

async function getSession(sessionId: string): Promise<SessionRecord | null> {
  const raw = await redisGet(sessionKey(sessionId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SerializedSession;
    return deserializeSession(parsed);
  } catch (error) {
    console.error('[session-manager-redis] Failed to parse session payload', error);
    await redisDel(sessionKey(sessionId));
    return null;
  }
}

function computeRenewalFlag(session: SessionRecord): boolean {
  const idleTime = Date.now() - session.lastActivityAt.getTime();
  return idleTime > SESSION_CONFIG.renewalThreshold;
}

async function createSession(
  user: User,
  metadata?: SessionMetadata
): Promise<SessionRecord | null> {
  if (!hasRedisConfig) {
    return null;
  }

  const session = buildSessionRecord(user, metadata);
  const serialized = serializeSession(session);
  const ttlMs = SESSION_CONFIG.absoluteTimeout;

  await redisPipeline([
    ['SET', sessionKey(session.sessionId), JSON.stringify(serialized), 'PX', Math.max(ttlMs, 1000).toString()],
    ['SADD', userSessionsKey(user.id), session.sessionId],
    ['PEXPIRE', userSessionsKey(user.id), Math.max(ttlMs, 1000).toString()],
  ]);

  await enforceConcurrentSessionLimit(user.id);
  return session;
}

async function validateSession(sessionId: string): Promise<SessionValidationResult> {
  if (!hasRedisConfig) {
    return { valid: false, reason: 'Redis not configured' };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await destroySession(sessionId);
    return { valid: false, reason: 'Session expired' };
  }

  const idleTime = now - session.lastActivityAt.getTime();
  if (idleTime > SESSION_CONFIG.idleTimeout) {
    await destroySession(sessionId);
    return { valid: false, reason: 'Session idle timeout' };
  }

  return {
    valid: true,
    session,
    shouldRenew: computeRenewalFlag(session),
  };
}

async function renewSession(sessionId: string): Promise<boolean> {
  if (!hasRedisConfig) {
    return false;
  }

  const session = await getSession(sessionId);
  if (!session) {
    return false;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await destroySession(sessionId);
    return false;
  }

  session.lastActivityAt = new Date(now);
  const serialized = serializeSession(session);
  const remainingMs = Math.max(session.expiresAt.getTime() - now, 1000);
  await redisSet(sessionKey(sessionId), JSON.stringify(serialized), remainingMs);
  await redisExpire(userSessionsKey(session.userId), remainingMs);
  return true;
}

async function destroySession(sessionId: string): Promise<boolean> {
  if (!hasRedisConfig) {
    return false;
  }

  const session = await getSession(sessionId);
  await redisDel(sessionKey(sessionId));
  if (session) {
    await redisSRem(userSessionsKey(session.userId), sessionId);
  }
  return true;
}

async function destroyUserSessions(userId: string): Promise<number> {
  if (!hasRedisConfig) {
    return 0;
  }

  const sessions = await redisSMembers(userSessionsKey(userId));
  if (!sessions.length) {
    return 0;
  }

  await redisDel(...sessions.map((sessionId) => sessionKey(sessionId)));
  await redisDel(userSessionsKey(userId));
  return sessions.length;
}

async function getUserSessions(userId: string): Promise<SessionRecord[]> {
  if (!hasRedisConfig) {
    return [];
  }
  const sessionIds = await redisSMembers(userSessionsKey(userId));
  if (!sessionIds.length) {
    return [];
  }
  const sessions = await Promise.all(sessionIds.map((id) => getSession(id)));
  return sessions.filter((session): session is SessionRecord => Boolean(session));
}

async function cleanupExpiredSessions(): Promise<void> {
  if (!hasRedisConfig) {
    return;
  }

  const keys = await redisScan(`${USER_SESSIONS_KEY_PREFIX}*${USER_SESSIONS_SUFFIX}`);
  if (!keys.length) return;

  await Promise.all(
    keys.map(async (key) => {
      const members = await redisSMembers(key);
      if (!members.length) return;

      const stale: string[] = [];
      for (const sessionId of members) {
        const exists = await redisGet(sessionKey(sessionId));
        if (!exists) {
          stale.push(sessionId);
        }
      }

      if (stale.length) {
        await redisSRem(key, ...stale);
      }
    })
  );
}

const redisSessionStore: SessionStore = {
  createSession,
  validateSession,
  renewSession,
  destroySession,
  destroyUserSessions,
  getUserSessions,
  getSession,
  cleanupExpiredSessions,
};

export function isRedisSessionStoreAvailable(): boolean {
  return hasRedisConfig;
}

export default redisSessionStore;
