/**
 * Redis/Upstash client configuration
 * 
 * This module provides a centralized Redis client for distributed state management,
 * replacing the in-memory Maps that were causing scaling issues.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client (works with Upstash or Redis-compatible services)
let redis: Redis | null = null;

/**
 * Get or create Redis client instance
 * Falls back to in-memory storage in development if Redis not configured
 */
export function getRedisClient(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

    if (!url || !token) {
      console.warn(
        'Redis not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment variables.'
      );
      // In development, we'll still use the in-memory fallback
      // In production, this should fail loudly
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis configuration is required in production');
      }
      return null;
    }

    try {
      redis = new Redis({
        url,
        token,
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      return null;
    }
  }

  return redis;
}

/**
 * Rate limit configurations using Redis
 */
export function createRateLimiter(
  identifier: string,
  requests: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
) {
  const redis = getRedisClient();
  
  if (!redis) {
    // Fallback for development without Redis
    console.warn('Rate limiting requires Redis. Using no-op in development.');
    return {
      limit: async () => ({
        success: true,
        limit: requests,
        reset: Date.now() + 60000,
        remaining: requests,
      }),
    };
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `ratelimit:${identifier}`,
  });
}

/**
 * Session storage operations
 */
export const SessionStore = {
  async get(sessionId: string): Promise<any> {
    const redis = getRedisClient();
    if (!redis) return null;
    
    try {
      return await redis.get(`session:${sessionId}`);
    } catch (error) {
      console.error('Failed to get session from Redis:', error);
      return null;
    }
  },

  async set(
    sessionId: string,
    data: any,
    expirationSeconds: number = 86400 // 24 hours default
  ): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.set(`session:${sessionId}`, data, {
        ex: expirationSeconds,
      });
      return true;
    } catch (error) {
      console.error('Failed to set session in Redis:', error);
      return false;
    }
  },

  async delete(sessionId: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session from Redis:', error);
      return false;
    }
  },

  async touch(sessionId: string, expirationSeconds: number = 86400): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.expire(`session:${sessionId}`, expirationSeconds);
      return true;
    } catch (error) {
      console.error('Failed to touch session in Redis:', error);
      return false;
    }
  },

  async getUserSessions(userId: string): Promise<string[]> {
    const redis = getRedisClient();
    if (!redis) return [];

    try {
      // Get all session IDs for a user
      const sessionIds = await redis.smembers(`user:${userId}:sessions`);
      return sessionIds as string[];
    } catch (error) {
      console.error('Failed to get user sessions from Redis:', error);
      return [];
    }
  },

  async addUserSession(userId: string, sessionId: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.sadd(`user:${userId}:sessions`, sessionId);
      return true;
    } catch (error) {
      console.error('Failed to add user session to Redis:', error);
      return false;
    }
  },

  async removeUserSession(userId: string, sessionId: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.srem(`user:${userId}:sessions`, sessionId);
      return true;
    } catch (error) {
      console.error('Failed to remove user session from Redis:', error);
      return false;
    }
  },
};

/**
 * Cache operations for general use
 */
export const CacheStore = {
  async get<T = any>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      return await redis.get(key) as T;
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return null;
    }
  },

  async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      if (ttlSeconds) {
        await redis.set(key, value, { ex: ttlSeconds });
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Failed to set cache:', error);
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Failed to delete from cache:', error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Failed to check cache existence:', error);
      return false;
    }
  },
};

/**
 * Helper to check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}