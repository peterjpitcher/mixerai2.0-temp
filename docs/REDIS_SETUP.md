# Redis Setup for MixerAI 2.0

## Overview
Redis is now required for production deployments to handle:
- Distributed rate limiting across serverless instances
- Session management with proper concurrency control
- General caching for improved performance

## Environment Variables

Add these to your `.env.local` or production environment:

```bash
# Upstash Redis (Recommended for Vercel)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Alternative: Standard Redis
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

## Setup Instructions

### Option 1: Upstash (Recommended for Vercel)
1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Choose a region close to your Vercel deployment
4. Copy the REST URL and token from the dashboard
5. Add them to your environment variables

### Option 2: Redis Cloud
1. Sign up at [redis.com](https://redis.com/cloud)
2. Create a new database
3. Configure connection settings
4. Add connection string to environment variables

### Option 3: Self-Hosted Redis
1. Deploy Redis on your infrastructure
2. Ensure it's accessible from your application
3. Configure connection URL and authentication

## Development Without Redis

In development, the application will fall back to in-memory storage with warnings. This is acceptable for local development but not for production.

To suppress warnings in development:
```bash
# In .env.local
SKIP_REDIS_WARNING=true
```

## Testing Redis Connection

After configuration, test the connection:
```bash
node scripts/test-redis-connection.js
```

## Redis Key Structure

The application uses the following key patterns:

- **Rate Limiting**: `ratelimit:[type]:[identifier]`
  - Example: `ratelimit:api:192.168.1.1`
  - Example: `ratelimit:auth:192.168.1.1:user123`

- **Sessions**: `session:[sessionId]`
  - Example: `session:550e8400-e29b-41d4-a716-446655440000`

- **User Sessions**: `user:[userId]:sessions`
  - Example: `user:123:sessions` (Redis Set)

- **Cache**: `cache:[key]`
  - Example: `cache:brand:456:settings`

## Monitoring

Monitor Redis usage through:
- Upstash Dashboard (if using Upstash)
- Redis CLI commands
- Application logs for connection issues

## Troubleshooting

### "Redis not available" in production
- Verify environment variables are set correctly
- Check network connectivity to Redis instance
- Ensure Redis instance is running

### High memory usage
- Review TTL settings for keys
- Implement key eviction policies
- Monitor for memory leaks

### Rate limiting not working
- Confirm Redis connection is active
- Check for clock skew between servers
- Verify rate limit configurations

## Performance Impact

With Redis properly configured:
- Rate limiting works across all serverless instances
- Session management prevents duplicate sessions
- Reduced database load through caching
- Consistent state across deployments

## Security Considerations

- Always use TLS/SSL connections in production
- Rotate Redis tokens regularly
- Implement IP whitelisting if possible
- Monitor for suspicious access patterns