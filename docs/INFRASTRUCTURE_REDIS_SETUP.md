# Redis Setup for Production Rate Limiting

## Overview

The current rate limiting implementation uses in-memory storage which doesn't work correctly in production environments with multiple server instances. Each instance maintains its own rate limit counters, allowing users to bypass limits by hitting different servers.

## Problem

In production, you may have:
- Multiple Vercel serverless functions
- Multiple container instances
- Load-balanced servers

Each instance has its own memory, so rate limit counters are not shared, effectively multiplying the allowed rate by the number of instances.

## Solution: Redis

Redis provides a centralized, shared storage for rate limit counters across all instances.

## Setup Instructions

### 1. Choose a Redis Provider

#### Recommended Options:
- **Upstash Redis** (Recommended for Vercel)
  - Serverless Redis with pay-per-request pricing
  - Native Vercel integration
  - Global edge locations
  - Setup: https://upstash.com/

- **Redis Cloud**
  - Managed Redis with fixed pricing
  - Good for predictable workloads
  - Setup: https://redis.com/cloud/

- **AWS ElastiCache**
  - If already using AWS infrastructure
  - Setup: https://aws.amazon.com/elasticache/

### 2. Environment Variables

Add to your `.env.production`:

```env
# Redis connection
REDIS_URL=redis://default:password@your-redis-host:6379
# or for Upstash
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### 3. Install Redis Client

```bash
npm install @upstash/redis
# or
npm install ioredis
```

### 4. Update Rate Limiter Implementation

Create `/src/lib/rate-limit-redis.ts`:

```typescript
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
}

export async function checkRateLimitRedis(
  request: NextRequest,
  config: RateLimitConfig
) {
  const clientId = getClientId(request);
  const key = `rate_limit:${config.keyPrefix || 'api'}:${clientId}`;
  const now = Date.now();
  const window = Math.floor(now / config.windowMs);
  const windowKey = `${key}:${window}`;

  try {
    // Increment counter
    const count = await redis.incr(windowKey);
    
    // Set expiry on first request
    if (count === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }

    const allowed = count <= config.max;
    const remaining = Math.max(0, config.max - count);
    const resetTime = (window + 1) * config.windowMs;

    return {
      allowed,
      limit: config.max,
      remaining,
      reset: new Date(resetTime),
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback: allow request if Redis is down
    return {
      allowed: true,
      limit: config.max,
      remaining: config.max,
      reset: new Date(now + config.windowMs),
    };
  }
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  const userId = request.headers.get('x-user-id');
  return userId ? `${ip}:${userId}` : ip;
}
```

### 5. Update Middleware

In `/src/middleware.ts`, replace the rate limit check:

```typescript
// Import Redis rate limiter for production
const checkRateLimit = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  ? require('./lib/rate-limit-redis').checkRateLimitRedis
  : require('./lib/rate-limit').checkRateLimit;
```

### 6. Monitoring

Add monitoring for rate limit hits:

```typescript
// Log rate limit violations
if (!rateLimitResult.allowed) {
  console.warn('Rate limit exceeded', {
    path: request.nextUrl.pathname,
    clientId: getClientId(request),
    limit: rateLimitConfig.max,
    window: rateLimitConfig.windowMs,
  });
}
```

## Best Practices

1. **Set appropriate limits**: Current limits are quite strict (100 req/min for general API). Consider increasing for authenticated users.

2. **Use sliding windows**: Instead of fixed windows, implement sliding windows for smoother rate limiting.

3. **Implement user-based limits**: Different limits for authenticated vs anonymous users.

4. **Add bypass for internal services**: Allow certain services to bypass rate limits.

5. **Monitor and adjust**: Track rate limit hits and adjust limits based on actual usage patterns.

## Recommended Rate Limits for Production

```typescript
export const productionRateLimits = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Increased from 5
  },
  
  // General API endpoints (authenticated users)
  apiAuthenticated: {
    windowMs: 60 * 1000, // 1 minute
    max: 300, // Increased from 100
  },
  
  // General API endpoints (anonymous)
  apiAnonymous: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Lower for anonymous
  },
  
  // AI endpoints
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Increased from 10
  },
  
  // Expensive AI operations
  aiExpensive: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Increased from 5
  },
};
```

## Testing

1. Test rate limiting locally with Redis running in Docker:
   ```bash
   docker run -p 6379:6379 redis:alpine
   ```

2. Use a load testing tool to verify limits:
   ```bash
   npm install -g loadtest
   loadtest -n 200 -c 10 http://localhost:3000/api/brands
   ```

## Troubleshooting

1. **Redis connection errors**: Check your Redis URL and network connectivity
2. **Rate limits not working**: Ensure Redis client is properly initialized
3. **Performance issues**: Consider using Redis pipelining for bulk operations
4. **Memory usage**: Set appropriate TTLs on rate limit keys