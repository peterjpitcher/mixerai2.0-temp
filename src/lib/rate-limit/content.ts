import { NextRequest } from 'next/server';

import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitConfigs,
} from '../rate-limit';

export type RateLimitFailure = {
  type: 'user' | 'brand';
  status: 429;
  body: {
    success: false;
    error: string;
  };
  headers: HeadersInit;
};

export type RateLimitEnforcementResult =
  | { ok: true }
  | RateLimitFailure;

/**
 * Apply layered rate limiting for content generation endpoints.
 *
 * Enforces:
 * 1. Per-user ceilings to prevent a single account from exhausting capacity.
 * 2. Per-user-per-brand ceilings to protect individual brand workspaces.
 */
export async function enforceContentRateLimits(
  request: NextRequest,
  userId: string,
  brandId?: string | null,
  options?: {
    userLimitConfigKey?: keyof typeof rateLimitConfigs;
    brandLimitConfigKey?: keyof typeof rateLimitConfigs;
  }
): Promise<RateLimitEnforcementResult> {
  const userLimitConfig = rateLimitConfigs[options?.userLimitConfigKey ?? 'ai'];
  const brandLimitConfig = rateLimitConfigs[options?.brandLimitConfigKey ?? 'aiExpensive'];

  const userLimit = await checkRateLimit(request, userLimitConfig, {
    keyParts: ['content', 'user', userId],
  });

  if (!userLimit.allowed) {
    return {
      type: 'user',
      status: 429,
      body: {
        success: false,
        error: userLimitConfig.message ?? 'Rate limit exceeded. Please try again later.',
      },
      headers: getRateLimitHeaders(userLimit),
    };
  }

  if (brandId) {
    const brandLimit = await checkRateLimit(request, brandLimitConfig, {
      keyParts: ['content', 'brand', brandId, userId],
    });

    if (!brandLimit.allowed) {
      return {
        type: 'brand',
        status: 429,
        body: {
          success: false,
          error: brandLimitConfig.message ?? 'Brand-scoped rate limit exceeded. Try again soon.',
        },
        headers: getRateLimitHeaders(brandLimit),
      };
    }
  }

  return { ok: true };
}
