# Health Check Endpoint Implementation

## Overview
Implemented a comprehensive health check endpoint at `/api/health` for monitoring application status and service dependencies.

## Endpoint Details

### GET /api/health
Returns detailed health status of the application and its dependencies.

**Response Format:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-06-26T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful",
      "responseTime": 23
    },
    "authentication": {
      "status": "pass",
      "message": "Authentication service operational",
      "responseTime": 15
    },
    "azureOpenAI": {
      "status": "pass",
      "message": "Azure OpenAI configuration present"
    },
    "redis": {
      "status": "warn",
      "message": "Redis unavailable, using in-memory rate limiting"
    }
  }
}
```

### HEAD /api/health
Simple liveness check - returns 200 if application is running.

## Status Codes

- **200 OK**: All critical services operational (status: "healthy" or "degraded")
- **503 Service Unavailable**: Critical service failure (status: "unhealthy")

## Health Status Definitions

1. **healthy**: All services operational
2. **degraded**: Non-critical services failing or warnings present
3. **unhealthy**: Critical services (database) failing

## Service Checks

### 1. Database Check
- Performs simple SELECT query on profiles table
- Measures response time
- Critical service - failure results in "unhealthy" status

### 2. Authentication Check
- Verifies Supabase auth service availability
- Non-critical - failure results in "degraded" status

### 3. Azure OpenAI Check
- Validates configuration presence
- Warning if incomplete configuration
- Non-critical service

### 4. Redis Check (Optional)
- Only checked if REDIS_URL is configured
- Used for distributed rate limiting
- Falls back to in-memory if unavailable

## Usage Examples

### Command Line
```bash
# Check health status
curl http://localhost:3000/api/health

# Simple liveness check
curl -I http://localhost:3000/api/health
```

### Using Health Check Script
```bash
# Run health check
node scripts/health-check.js

# With custom URL
HEALTH_CHECK_URL=https://app.example.com/api/health node scripts/health-check.js

# With custom timeout
HEALTH_CHECK_TIMEOUT=5000 node scripts/health-check.js
```

### Monitoring Integration

#### Kubernetes
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

#### Docker Compose
```yaml
healthcheck:
  test: ["CMD", "node", "scripts/health-check.js"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### AWS ALB Health Check
- Path: `/api/health`
- Port: 3000
- Protocol: HTTP
- Success codes: 200
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Security Considerations

1. **Public Endpoint**: No authentication required
2. **No CSRF Protection**: GET/HEAD requests only
3. **No Sensitive Data**: Only service status exposed
4. **Cache Prevention**: No-cache headers prevent stale data

## Performance Impact

- Lightweight checks (~50ms total)
- Database query limited to 1 row
- No heavy computations
- Suitable for frequent polling (every 10-30 seconds)

## Monitoring Best Practices

1. **Alert on Status Changes**: Monitor transitions between states
2. **Track Response Times**: Alert on degraded performance
3. **Monitor Uptime**: Track application restarts
4. **Check Individual Services**: Alert on specific service failures
5. **Use Appropriate Intervals**: Balance between freshness and load

## Dashboard Integration

Create monitoring dashboards showing:
- Current health status
- Service status grid
- Response time trends
- Uptime percentage
- Historical health events

## Future Enhancements

1. **Additional Checks**:
   - Email service (Resend)
   - File storage (if applicable)
   - External API dependencies
   - Queue service status

2. **Metrics Collection**:
   - Prometheus metrics endpoint
   - Custom metrics tracking
   - Performance benchmarks

3. **Advanced Features**:
   - Dependency graph visualization
   - Automatic service recovery
   - Health check history storage
   - SLA tracking

## Testing

```bash
# Test healthy state
npm run dev
curl http://localhost:3000/api/health | jq .

# Test database failure
# Stop database and check response

# Test degraded state
# Remove Azure OpenAI config and check
```

## Troubleshooting

### Common Issues

1. **Database timeout**: Check connection string and network
2. **Auth service failure**: Verify Supabase configuration
3. **High response times**: Check database indexes and query performance
4. **False positives**: Adjust timeout values if needed

### Debug Mode
Set `DEBUG=health:*` for detailed logging:
```bash
DEBUG=health:* npm run dev
```