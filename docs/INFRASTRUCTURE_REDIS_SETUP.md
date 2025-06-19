# Redis Infrastructure Setup for Production

This document outlines the Redis implementation requirements for production deployment of MixerAI 2.0.

## Overview

Currently, the application uses in-memory storage for several critical features in development. For production deployment, these should be replaced with Redis or a distributed cache solution to ensure proper functionality across multiple server instances.

## Components Requiring Redis

### 1. Account Lockout System (`/src/lib/auth/account-lockout.ts`)
- **Current**: In-memory Map storing login attempts
- **Required**: Redis hash or sorted set for distributed lockout tracking
- **Key Structure**: `lockout:{email}` with attempt records
- **TTL**: Based on `sessionConfig.lockout.checkWindow`

### 2. Session Management (`/src/lib/auth/session-manager.ts`)
- **Current**: In-memory Map for session storage
- **Required**: Redis session store
- **Key Structure**: `session:{sessionId}` with user data
- **TTL**: Based on `sessionConfig.idleTimeout` and `sessionConfig.absoluteTimeout`

### 3. Rate Limiting (`/src/lib/rate-limit.ts`)
- **Current**: In-memory Map for rate limit tracking
- **Required**: Redis counters with sliding windows
- **Key Structure**: `rate:{prefix}:{clientId}` with count and reset time
- **TTL**: Based on rate limit window configuration

## Implementation Guide

### Redis Client Setup
```typescript
// /src/lib/redis/client.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export default redis;
```

### Account Lockout Implementation
```typescript
// Example Redis implementation for account lockout
export async function recordLoginAttempt(
  email: string, 
  ip: string, 
  success: boolean
): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`;
  const attempt = JSON.stringify({ ip, success, timestamp: Date.now() });
  
  await redis.zadd(key, Date.now(), attempt);
  await redis.expire(key, sessionConfig.lockout.checkWindow / 1000);
  
  // Clean old attempts
  const cutoff = Date.now() - sessionConfig.lockout.checkWindow;
  await redis.zremrangebyscore(key, '-inf', cutoff);
}
```

### Session Store Implementation
```typescript
// Example Redis session store
export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const sessionData = {
    userId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  
  await redis.setex(
    `session:${sessionId}`,
    sessionConfig.absoluteTimeout / 1000,
    JSON.stringify(sessionData)
  );
  
  return sessionId;
}
```

### Rate Limiting Implementation
```typescript
// Example Redis rate limiter
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const key = `rate:${config.keyPrefix}:${clientId}`;
  
  const multi = redis.multi();
  const now = Date.now();
  const window = now - config.windowMs;
  
  multi.zremrangebyscore(key, '-inf', window);
  multi.zadd(key, now, now);
  multi.zcard(key);
  multi.expire(key, Math.ceil(config.windowMs / 1000));
  
  const results = await multi.exec();
  const count = results[2][1] as number;
  
  return {
    allowed: count <= config.max,
    count,
    remaining: Math.max(0, config.max - count),
    reset: new Date(now + config.windowMs),
  };
}
```

## Environment Variables

Add these to your production environment:

```bash
# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true  # For Redis with TLS/SSL
```

## Deployment Considerations

1. **Redis Provider Options**:
   - Upstash Redis (Vercel integration)
   - Redis Cloud
   - AWS ElastiCache
   - Self-hosted Redis

2. **High Availability**:
   - Use Redis Sentinel or Cluster for HA
   - Implement connection pooling
   - Add retry logic for transient failures

3. **Monitoring**:
   - Track Redis memory usage
   - Monitor connection pool health
   - Set up alerts for high latency

4. **Security**:
   - Use TLS/SSL connections
   - Implement proper access controls
   - Regular security audits

## Migration Strategy

1. **Phase 1**: Add Redis client and connection handling
2. **Phase 2**: Implement feature flags to switch between in-memory and Redis
3. **Phase 3**: Test Redis implementations in staging
4. **Phase 4**: Gradual rollout with monitoring
5. **Phase 5**: Remove in-memory implementations

## Testing

Create integration tests for Redis implementations:

```typescript
// /src/lib/redis/__tests__/rate-limit.test.ts
describe('Redis Rate Limiter', () => {
  beforeEach(async () => {
    await redis.flushdb();
  });
  
  it('should enforce rate limits across instances', async () => {
    // Test distributed rate limiting
  });
});
```

## Fallback Strategy

Implement graceful degradation when Redis is unavailable:

```typescript
async function withRedisFallback<T>(
  redisOperation: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    return await redisOperation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback();
  }
}
```

## Next Steps

1. Choose a Redis provider based on your infrastructure
2. Set up Redis instances for development and staging
3. Implement Redis clients following the examples above
4. Test thoroughly with multiple server instances
5. Monitor performance and adjust configurations

This infrastructure upgrade is essential for production deployment to ensure proper functionality, security, and scalability across distributed server instances.