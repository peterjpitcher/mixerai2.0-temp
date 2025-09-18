import { NextRequest } from 'next/server';
import { checkRateLimit as advancedCheckRateLimit, RateLimitConfig } from '@/lib/rate-limit';

export type RateLimitType = 'auth' | 'ai-expensive' | 'ai-standard' | 'api' | 'sensitive';

type SimpleConfig = {
  requests: number;
  windowMs: number;
  message: string;
};

const RATE_LIMIT_PRESETS: Record<RateLimitType, SimpleConfig> = {
  auth: {
    requests: 20,
    windowMs: 15 * 60 * 1000,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  'ai-expensive': {
    requests: 30,
    windowMs: 5 * 60 * 1000,
    message: 'AI generation rate limit exceeded. Please wait a few minutes.',
  },
  'ai-standard': {
    requests: 60,
    windowMs: 60 * 1000,
    message: 'AI request rate limit exceeded. Please wait a minute.',
  },
  api: {
    requests: 600,
    windowMs: 60 * 1000,
    message: 'API rate limit exceeded. Please slow down.',
  },
  sensitive: {
    requests: 50,
    windowMs: 60 * 60 * 1000,
    message: 'Too many sensitive operations. Please wait an hour.',
  },
};

function toAdvancedConfig(type: RateLimitType): RateLimitConfig {
  const preset = RATE_LIMIT_PRESETS[type];
  return {
    windowMs: preset.windowMs,
    max: preset.requests,
    keyPrefix: `middleware-${type}`,
    message: preset.message,
  };
}

export function getRateLimitType(pathname: string): RateLimitType {
  if (pathname.includes('/auth/') || pathname.includes('/api/auth/')) {
    return 'auth';
  }

  if (
    pathname.includes('/api/tools/') &&
    (pathname.includes('content-transcreator') || pathname.includes('article-generator'))
  ) {
    return 'ai-expensive';
  }

  if (pathname.includes('/api/tools/') || pathname.includes('/api/content/generate')) {
    return 'ai-standard';
  }

  if (
    pathname.includes('/api/users/') ||
    (pathname.includes('/api/brands/') && (pathname.includes('delete') || pathname.includes('deactivate')))
  ) {
    return 'sensitive';
  }

  return 'api';
}

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
  const preset = RATE_LIMIT_PRESETS[type];
  const config = toAdvancedConfig(type);

  const result = await advancedCheckRateLimit(req, config, {
    identifier: userId,
    keyParts: ['middleware', type, userId ?? 'anonymous'],
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.reset.getTime(),
    retryAfter: result.retryAfter,
    message: preset.message,
    headers: {
      'X-RateLimit-Limit': preset.requests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toISOString(),
      ...(result.retryAfter !== undefined ? { 'Retry-After': result.retryAfter.toString() } : {}),
    },
  };
}
