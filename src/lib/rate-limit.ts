import { NextRequest } from 'next/server';
import { emitMetric } from '@/lib/observability/metrics';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
  violations?: number;
}

const BASE_KEY_PREFIX = 'rate-limit';

interface RedisHttpClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(keys: string[]): Promise<void>;
  scan(pattern: string): Promise<string[]>;
}

let redisClient: RedisHttpClient | null | undefined;

async function redisPipeline(commands: string[][]): Promise<Array<{ result: unknown }>> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis REST credentials not configured');
  }

  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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

function createRedisClient(): RedisHttpClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  return {
    async get(key: string) {
      const [result] = await redisPipeline([['GET', key]]);
      return (result?.result as string | null) ?? null;
    },
    async set(key: string, value: string, ttlSeconds: number) {
      await redisPipeline([['SET', key, value, 'EX', ttlSeconds.toString()]]);
    },
    async delete(keys: string[]) {
      if (!keys.length) return;
      await redisPipeline([['DEL', ...keys]]);
    },
    async scan(pattern: string) {
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [result] = await redisPipeline([
          ['SCAN', cursor, 'MATCH', pattern, 'COUNT', '100'],
        ]);
        const raw = result?.result as [string, string[]] | undefined;
        const nextCursor = raw?.[0] ?? '0';
        const found = Array.isArray(raw?.[1]) ? (raw![1] as string[]) : [];
        keys.push(...found);
        cursor = nextCursor;
      } while (cursor !== '0');

      return keys;
    },
  };
}

function getRedisClient(): RedisHttpClient | null {
  if (redisClient === undefined) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

function getBackendType(): 'redis' | 'memory' {
  return getRedisClient() ? 'redis' : 'memory';
}

const memoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60 * 1000;
setInterval(() => {
  if (getBackendType() === 'redis') return;
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
      memoryStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

async function loadEntry(key: string): Promise<RateLimitEntry | null> {
  if (getBackendType() === 'redis') {
    const client = getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RateLimitEntry;
    } catch {
      await client.delete([key]);
      return null;
    }
  }

  return memoryStore.get(key) ?? null;
}

async function saveEntry(key: string, entry: RateLimitEntry): Promise<void> {
  if (getBackendType() === 'redis') {
    const client = getRedisClient();
    if (!client) return;
    const now = Date.now();
    const expireTarget = Math.max((entry.blockUntil ?? entry.resetTime) - now, 1000);
    await client.set(key, JSON.stringify(entry), Math.ceil(expireTarget / 1000));
    return;
  }

  memoryStore.set(key, entry);
}

function buildRateLimitKey(
  baseIdentifier: string,
  config: RateLimitConfig,
  extraKeyParts?: Array<string | null | undefined>
): string {
  const sanitizedParts = (extraKeyParts || [])
    .filter((part): part is string => Boolean(part && part.trim().length))
    .map((part) => part.replace(/[:\s]+/g, '-'));

  const namespace = sanitizedParts.length
    ? `${sanitizedParts.join(':')}:${baseIdentifier}`
    : baseIdentifier;

  const withConfigPrefix = config.keyPrefix ? `${config.keyPrefix}:${namespace}` : namespace;
  return `${BASE_KEY_PREFIX}:${withConfigPrefix}`;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  backend: 'redis' | 'memory';
}

type RateLimitOptions = {
  identifier?: string;
  keyParts?: Array<string | null | undefined>;
};

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const backend = getBackendType();
  const clientId = options?.identifier?.trim().length ? options.identifier : getClientId(request);
  const key = buildRateLimitKey(clientId, config, options?.keyParts);
  const now = Date.now();

  let entry = await loadEntry(key);

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      blocked: false,
      blockUntil: undefined,
      violations: 0,
    };
  }

  if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
    const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
    await saveEntry(key, entry);
    emitMetric({
      name: 'rate_limit.blocked',
      tags: {
        backend,
        key: config.keyPrefix ?? 'default',
      },
      context: {
        identifier: clientId,
        retryAfter,
      },
    });
    return {
      allowed: false,
      limit: config.max,
      remaining: 0,
      reset: new Date(entry.blockUntil),
      retryAfter,
      backend,
    };
  }

  const allowed = entry.count < config.max;
  if (allowed) {
    entry.count += 1;
    await saveEntry(key, entry);
    const remaining = Math.max(0, config.max - entry.count);
    return {
      allowed: true,
      limit: config.max,
      remaining,
      reset: new Date(entry.resetTime),
      backend,
    };
  }

  const violations = (entry.violations ?? 0) + 1;
  entry.violations = violations;

  if (violations >= 3) {
    const blockDuration = Math.min(config.windowMs * Math.pow(2, violations - 3), 60 * 60 * 1000);
    entry.blocked = true;
    entry.blockUntil = now + blockDuration;
  }

  await saveEntry(key, entry);

  const retryAfter = entry.blocked && entry.blockUntil
    ? Math.ceil((entry.blockUntil - now) / 1000)
    : Math.ceil((entry.resetTime - now) / 1000);

  emitMetric({
    name: 'rate_limit.violation',
    tags: {
      backend,
      key: config.keyPrefix ?? 'default',
    },
    context: {
      identifier: clientId,
      retryAfter,
      violations,
    },
  });

  return {
    allowed: false,
    limit: config.max,
    remaining: 0,
    reset: new Date(entry.resetTime),
    retryAfter,
    backend,
  };
}

export async function resetRateLimitStore(): Promise<void> {
  memoryStore.clear();

  if (getBackendType() === 'redis') {
    try {
      const client = getRedisClient();
      if (!client) return;
      const keys = await client.scan(`${BASE_KEY_PREFIX}:*`);
      if (keys.length) {
        await client.delete(keys);
      }
    } catch (error) {
      console.warn('[rate-limit] Failed to reset redis store', error);
    }
  }
}

export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  const userId = request.headers.get('x-user-id');
  return userId ? `${ip}:${userId}` : ip;
}

export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyPrefix: 'auth',
    message: 'Too many authentication attempts. Please try again later.',
  },
  ai: {
    windowMs: 60 * 1000,
    max: 60,
    keyPrefix: 'ai',
    message: 'AI service rate limit exceeded. Please wait before trying again.',
  },
  aiExpensive: {
    windowMs: 5 * 60 * 1000,
    max: 30,
    keyPrefix: 'ai-expensive',
    message: 'Rate limit exceeded for AI generation. Please wait a few minutes.',
  },
  api: {
    windowMs: 60 * 1000,
    max: 600,
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down.',
  },
  sensitive: {
    windowMs: 60 * 60 * 1000,
    max: 50,
    keyPrefix: 'sensitive',
    message: 'Rate limit exceeded for sensitive operations.',
  },
} as const;
