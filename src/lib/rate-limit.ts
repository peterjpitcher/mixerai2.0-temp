import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  keyPrefix?: string; // Prefix for the rate limit key
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  message?: string; // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
  violations?: number;
}

// In-memory storage for rate limits
// NOTE: For production/distributed deployments, implement Redis as documented in /docs/INFRASTRUCTURE_REDIS_SETUP.md
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Get client identifier from request
 */
export function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Include user ID if authenticated to prevent IP-based bypass
  const userId = request.headers.get('x-user-id');
  
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; limit: number; remaining: number; reset: Date; retryAfter?: number } {
  const clientId = getClientId(request);
  const key = config.keyPrefix ? `${config.keyPrefix}:${clientId}` : clientId;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Initialize or reset entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if client is blocked (exponential backoff)
  if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
    const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
    return {
      allowed: false,
      limit: config.max,
      remaining: 0,
      reset: new Date(entry.blockUntil),
      retryAfter,
    };
  }
  
  // Check rate limit
  const allowed = entry.count < config.max;
  const remaining = Math.max(0, config.max - entry.count - 1);
  
  if (allowed) {
    entry.count++;
  } else {
    // Implement exponential backoff for repeat offenders
    const violations = (entry.violations || 0) + 1;
    entry.violations = violations;
    
    if (violations >= 3) {
      // Block for exponentially increasing time
      const blockDuration = Math.min(
        config.windowMs * Math.pow(2, violations - 3),
        3600000 // Max 1 hour
      );
      entry.blocked = true;
      entry.blockUntil = now + blockDuration;
    }
  }
  
  return {
    allowed,
    limit: config.max,
    remaining: allowed ? remaining : 0,
    reset: new Date(entry.resetTime),
    retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    keyPrefix: 'auth',
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Moderate rate limiting for AI endpoints
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    keyPrefix: 'ai',
    message: 'AI service rate limit exceeded. Please wait before trying again.',
  },
  
  // Strict rate limiting for expensive AI operations
  aiExpensive: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 requests per 5 minutes
    keyPrefix: 'ai-expensive',
    message: 'Rate limit exceeded for AI generation. Please wait a few minutes.',
  },
  
  // Standard rate limiting for general API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down.',
  },
  
  // Very strict rate limiting for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    keyPrefix: 'sensitive',
    message: 'Rate limit exceeded for sensitive operations.',
  },
} as const;

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}