/**
 * Simple in-memory rate limiting implementation
 * Note: This only works for single-instance deployments
 * For distributed systems, consider using a database-backed solution
 */

import { NextRequest } from 'next/server';

/**
 * Rate limit configurations for different endpoint types
 */
const RATE_LIMIT_CONFIGS = {
  auth: {
    requests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  'ai-expensive': {
    requests: 30,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'AI generation rate limit exceeded. Please wait a few minutes.',
  },
  'ai-standard': {
    requests: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'AI request rate limit exceeded. Please wait a minute.',
  },
  api: {
    requests: 600,
    windowMs: 60 * 1000, // 1 minute
    message: 'API rate limit exceeded. Please slow down.',
  },
  sensitive: {
    requests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many sensitive operations. Please wait an hour.',
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextRequest, userId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers.get('x-real-ip') || 
             req.headers.get('cf-connecting-ip') || 
             req.ip || 
             'unknown';
  
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Determine rate limit type based on pathname
 */
export function getRateLimitType(pathname: string): RateLimitType {
  if (pathname.includes('/auth/') || pathname.includes('/api/auth/')) {
    return 'auth';
  }
  
  if (pathname.includes('/api/tools/') && 
      (pathname.includes('content-transcreator') || 
       pathname.includes('article-generator'))) {
    return 'ai-expensive';
  }
  
  if (pathname.includes('/api/tools/') || 
      pathname.includes('/api/content/generate')) {
    return 'ai-standard';
  }
  
  if (pathname.includes('/api/users/') || 
      pathname.includes('/api/brands/') && 
      (pathname.includes('delete') || pathname.includes('deactivate'))) {
    return 'sensitive';
  }
  
  return 'api';
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = 'api',
  userId?: string
): Promise<{
  allowed: boolean;
  remaining?: number;
  resetTime?: number;
  retryAfter?: number;
  message?: string;
  headers?: Record<string, string>;
}> {
  const config = RATE_LIMIT_CONFIGS[type];
  const identifier = getClientIdentifier(req, userId);
  const key = `${type}:${identifier}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= config.requests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
      message: config.message,
      headers: {
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    };
  }
  
  // Increment counter
  entry.count++;
  const remaining = config.requests - entry.count;
  
  return {
    allowed: true,
    remaining,
    resetTime: entry.resetTime,
    headers: {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    },
  };
}
