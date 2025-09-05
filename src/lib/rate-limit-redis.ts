/**
 * Redis-based Rate Limiting Implementation
 * 
 * Replaces the in-memory Map-based implementation with distributed Redis storage
 * for proper scaling across multiple serverless instances.
 */

import { NextRequest } from 'next/server';
import { createRateLimiter, isRedisAvailable } from '@/lib/redis/client';

/**
 * Rate limit configurations for different endpoint types
 */
const RATE_LIMIT_CONFIGS = {
  auth: {
    requests: 5,
    window: '15 m' as const,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  'ai-expensive': {
    requests: 5,
    window: '5 m' as const,
    message: 'AI generation rate limit exceeded. Please wait 5 minutes.',
  },
  'ai-standard': {
    requests: 10,
    window: '1 m' as const,
    message: 'AI request rate limit exceeded. Please wait a minute.',
  },
  api: {
    requests: 100,
    window: '1 m' as const,
    message: 'API rate limit exceeded. Please slow down.',
  },
  sensitive: {
    requests: 10,
    window: '1 h' as const,
    message: 'Too many sensitive operations. Please wait an hour.',
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Get client identifier for rate limiting
 * Uses IP address and optional user ID for more accurate limiting
 */
function getClientIdentifier(req: NextRequest, userId?: string): string {
  // Get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';
  
  // Combine with user ID if available for user-specific limits
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Check rate limit for a request
 * 
 * @param req - The Next.js request object
 * @param type - The type of rate limit to apply
 * @param userId - Optional user ID for user-specific rate limiting
 * @returns Object with allowed status and rate limit headers
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = 'api',
  userId?: string
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  retryAfter?: number;
  message?: string;
}> {
  // Check if Redis is available
  if (!isRedisAvailable()) {
    // In development without Redis, allow all requests
    if (process.env.NODE_ENV !== 'production') {
      return {
        allowed: true,
        headers: {},
      };
    }
    // In production, fail closed for security
    console.error('Redis not available for rate limiting in production');
    return {
      allowed: false,
      headers: {},
      message: 'Service temporarily unavailable',
    };
  }

  const config = RATE_LIMIT_CONFIGS[type];
  const identifier = getClientIdentifier(req, userId);
  
  // Create rate limiter for this endpoint type
  const limiter = createRateLimiter(type, config.requests, config.window);
  
  try {
    // Check the rate limit
    const result = await limiter.limit(identifier);
    
    // Prepare rate limit headers
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    };
    
    if (!result.success) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      headers['Retry-After'] = retryAfter.toString();
      
      return {
        allowed: false,
        headers,
        retryAfter,
        message: config.message,
      };
    }
    
    return {
      allowed: true,
      headers,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    
    // On error, be permissive in development, restrictive in production
    if (process.env.NODE_ENV === 'production') {
      return {
        allowed: false,
        headers: {},
        message: 'Rate limit check failed. Please try again.',
      };
    }
    
    return {
      allowed: true,
      headers: {},
    };
  }
}

/**
 * Determine rate limit type based on request path
 */
export function getRateLimitType(pathname: string): RateLimitType {
  // Auth endpoints
  if (pathname.includes('/auth/') || pathname.includes('/api/auth/')) {
    return 'auth';
  }
  
  // AI generation endpoints (expensive)
  if (
    pathname.includes('/api/ai/generate') ||
    pathname.includes('/api/content/generate') ||
    pathname.includes('/api/tools/')
  ) {
    return 'ai-expensive';
  }
  
  // AI standard endpoints
  if (pathname.includes('/api/ai/')) {
    return 'ai-standard';
  }
  
  // Sensitive operations
  if (
    pathname.includes('/api/users/') ||
    pathname.includes('/api/brands/') && ['POST', 'PUT', 'DELETE'].includes(pathname)
  ) {
    return 'sensitive';
  }
  
  // Default API rate limit
  return 'api';
}

/**
 * Express-style middleware wrapper for rate limiting
 * Can be used in API routes directly
 */
export function withRateLimit(
  type: RateLimitType = 'api'
) {
  return async function rateLimitMiddleware(
    req: NextRequest
  ): Promise<Response | null> {
    const userId = req.headers.get('x-user-id') || undefined;
    const result = await checkRateLimit(req, type, userId);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: result.message || 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers,
          },
        }
      );
    }
    
    // Rate limit passed, continue with request
    // Note: We'll need to add the headers to the response in the actual handler
    return null;
  };
}

/**
 * Reset rate limit for a specific identifier (useful for testing or admin overrides)
 */
export async function resetRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }
  
  try {
    const { CacheStore } = await import('@/lib/redis/client');
    const key = `ratelimit:${type}:${identifier}`;
    return await CacheStore.delete(key);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}