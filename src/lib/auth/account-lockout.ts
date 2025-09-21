import { sessionConfig } from './session-config';

interface AttemptRecord {
  timestamp: number;
  ip: string;
  success: boolean;
}

interface LockoutState {
  attempts: AttemptRecord[];
  lockedUntil?: number;
  lastAttemptIp?: string;
  lastAttemptAt?: number;
}

export interface AccountLockStatus {
  locked: boolean;
  attempts: number;
  remainingAttempts: number;
  remainingTime?: number;
  lockedUntil?: number;
}

declare global {
  // eslint-disable-next-line no-var
  var loginAttemptsStore: Map<string, LockoutState> | undefined;
}

const loginAttempts: Map<string, LockoutState> = globalThis.loginAttemptsStore ?? new Map();
globalThis.loginAttemptsStore = loginAttempts;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

const TTL_BUFFER_MS = Math.max(
  sessionConfig.lockout.duration + sessionConfig.lockout.checkWindow,
  30 * 60 * 1000
);

type RedisValue = {
  attempts: AttemptRecord[];
  lockedUntil?: number;
  lastAttemptIp?: string;
  lastAttemptAt?: number;
};

const stateKey = (email: string) => `account-lock:${email}`;

async function redisPipeline(commands: string[][]): Promise<Array<{ result: unknown }>> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis REST credentials not configured');
  }

  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redis pipeline error (${response.status}): ${text}`);
  }

  return (await response.json()) as Array<{ result: unknown }>;
}

async function redisGet(key: string): Promise<string | null> {
  const [result] = await redisPipeline([[ 'GET', key ]]);
  return (result?.result as string | null) ?? null;
}

async function redisSet(key: string, value: string, ttlMs: number): Promise<void> {
  await redisPipeline([[ 'SET', key, value, 'PX', Math.max(ttlMs, 1000).toString() ]]);
}

async function redisDel(key: string): Promise<void> {
  await redisPipeline([[ 'DEL', key ]]);
}

function newState(): LockoutState {
  return { attempts: [] };
}

async function getState(email: string, createIfMissing: boolean): Promise<LockoutState | null> {
  const normalized = email.toLowerCase();

  if (USE_REDIS) {
    const raw = await redisGet(stateKey(normalized));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RedisValue;
        return {
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
          lockedUntil: parsed.lockedUntil,
          lastAttemptIp: parsed.lastAttemptIp,
          lastAttemptAt: parsed.lastAttemptAt,
        };
      } catch (error) {
        console.error('[account-lockout] Failed to parse Redis payload', error);
        await redisDel(stateKey(normalized));
      }
    }
    return createIfMissing ? newState() : null;
  }

  const existing = loginAttempts.get(normalized);
  if (existing) {
    return existing;
  }
  if (!createIfMissing) {
    return null;
  }
  const state = newState();
  loginAttempts.set(normalized, state);
  return state;
}

async function saveState(email: string, state: LockoutState): Promise<void> {
  const normalized = email.toLowerCase();

  if (USE_REDIS) {
    if (state.attempts.length === 0 && !state.lockedUntil) {
      await redisDel(stateKey(normalized));
      return;
    }
    await redisSet(stateKey(normalized), JSON.stringify(state), TTL_BUFFER_MS);
    return;
  }

  if (state.attempts.length === 0 && !state.lockedUntil) {
    loginAttempts.delete(normalized);
    return;
  }

  loginAttempts.set(normalized, state);
}

function pruneState(state: LockoutState): void {
  const now = Date.now();
  const cutoff = now - sessionConfig.lockout.checkWindow;
  state.attempts = state.attempts.filter((attempt) => attempt.timestamp > cutoff && !attempt.success);
  refreshLockState(state);
}

function buildStatus(state: LockoutState): AccountLockStatus {
  const now = Date.now();
  const locked = typeof state.lockedUntil === 'number' && state.lockedUntil > now;
  const remainingTime = locked ? Math.max(0, Math.ceil((state.lockedUntil! - now) / 1000)) : undefined;
  const attempts = state.attempts.length;
  const remainingAttempts = locked
    ? 0
    : Math.max(0, sessionConfig.lockout.maxAttempts - attempts);

  return {
    locked,
    attempts,
    remainingAttempts,
    remainingTime,
    lockedUntil: state.lockedUntil,
  };
}

function refreshLockState(state: LockoutState): void {
  const now = Date.now();

  if (state.attempts.length === 0) {
    state.lockedUntil = undefined;
    return;
  }

  if (state.attempts.length >= sessionConfig.lockout.maxAttempts) {
    const lastAttemptTs = Math.max(...state.attempts.map((attempt) => attempt.timestamp));
    const lockoutEnd = lastAttemptTs + sessionConfig.lockout.duration;

    if (lockoutEnd <= now) {
      state.lockedUntil = undefined;
      state.attempts = [];
    } else {
      state.lockedUntil = lockoutEnd;
    }
    return;
  }

  state.lockedUntil = state.lockedUntil && state.lockedUntil > now ? state.lockedUntil : undefined;
}

if (!USE_REDIS) {
  setInterval(() => {
    for (const [email, state] of loginAttempts.entries()) {
      pruneState(state);
      if (state.attempts.length === 0 && !state.lockedUntil) {
        loginAttempts.delete(email);
      } else {
        loginAttempts.set(email, state);
      }
    }
  }, 5 * 60 * 1000);
}

export const _testHelpers = {
  clearStore: () => {
    loginAttempts.clear();
  },
  getStore: () => loginAttempts,
  __useRedis: () => USE_REDIS,
};

/**
 * Check if an account is locked due to too many failed attempts
 */
export async function isAccountLocked(email: string): Promise<AccountLockStatus> {
  const normalized = email.toLowerCase();
  const state = await getState(normalized, false);

  if (!state) {
    return {
      locked: false,
      attempts: 0,
      remainingAttempts: sessionConfig.lockout.maxAttempts,
    };
  }

  pruneState(state);
  await saveState(normalized, state);

  if (state.attempts.length === 0 && !state.lockedUntil) {
    return {
      locked: false,
      attempts: 0,
      remainingAttempts: sessionConfig.lockout.maxAttempts,
    };
  }

  return buildStatus(state);
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean
): Promise<AccountLockStatus> {
  const normalizedEmail = email.toLowerCase();
  const state = await getState(normalizedEmail, true);
  const now = Date.now();

  if (!state) {
    throw new Error('Unable to establish lockout state');
  }

  pruneState(state);

  if (success) {
    state.attempts = [];
    state.lockedUntil = undefined;
    state.lastAttemptIp = ip;
    state.lastAttemptAt = now;
    await saveState(normalizedEmail, state);
    return buildStatus(state);
  }

  console.log(`Failed login attempt for ${email} from ${ip}`);

  if (state.lockedUntil && state.lockedUntil > now) {
    state.lastAttemptIp = ip;
    state.lastAttemptAt = now;
    await saveState(normalizedEmail, state);
    return buildStatus(state);
  }

  state.attempts.push({ timestamp: now, ip, success: false });
  if (state.attempts.length > sessionConfig.lockout.maxAttempts) {
    state.attempts = state.attempts.slice(-sessionConfig.lockout.maxAttempts);
  }
  state.lastAttemptIp = ip;
  state.lastAttemptAt = now;

  const wasLocked = typeof state.lockedUntil === 'number' && state.lockedUntil > now;
  refreshLockState(state);
  const isLocked = typeof state.lockedUntil === 'number' && state.lockedUntil > now;

  if (!wasLocked && isLocked) {
    console.log(`Account locked: ${email} after ${sessionConfig.lockout.maxAttempts} failed attempts`);
    await logSecurityEvent('account_locked', {
      email,
      ip,
      attempts: sessionConfig.lockout.maxAttempts,
    });
  }

  await saveState(normalizedEmail, state);
  return buildStatus(state);
}

/**
 * Clear login attempts for a user (e.g., after password reset)
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  const normalized = email.toLowerCase();
  if (USE_REDIS) {
    await redisDel(stateKey(normalized));
    return;
  }
  loginAttempts.delete(normalized);
}

/**
 * Record a failed login attempt (convenience wrapper for tests)
 */
export async function recordFailedAttempt(email: string, ip: string = '127.0.0.1'): Promise<AccountLockStatus> {
  return recordLoginAttempt(email, ip, false);
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
export function cleanupOldAttempts(): { cleaned: number; remaining: number } {
  if (USE_REDIS) {
    return { cleaned: 0, remaining: -1 };
  }

  let cleaned = 0;

  for (const [email, state] of loginAttempts.entries()) {
    const beforeAttempts = state.attempts.length;
    pruneState(state);

    if (state.attempts.length === 0 && !state.lockedUntil) {
      loginAttempts.delete(email);
      if (beforeAttempts > 0) {
        cleaned += 1;
      }
    } else {
      loginAttempts.set(email, state);
    }
  }

  return {
    cleaned,
    remaining: loginAttempts.size,
  };
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
    console.log('[SECURITY EVENT]', {
      event_type: eventType,
      user_id: userId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
