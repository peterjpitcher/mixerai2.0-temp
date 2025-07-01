# API Errors Fix Guide

## Summary of Issues

1. **429 Rate Limiting Errors**: Multiple endpoints hitting rate limits
2. **Missing CSRF Tokens**: Many components using `fetch` instead of `apiFetch`
3. **Duplicate Requests**: Multiple API calls firing simultaneously
4. **In-Memory Rate Limiting**: Not suitable for production with multiple instances

## Immediate Fixes

### 1. Replace all `fetch` calls with `apiFetch`

#### Pattern to Find and Replace:

```typescript
// OLD - Don't use this
const response = await fetch('/api/endpoint');

// NEW - Use this instead
import { apiFetch } from '@/lib/api-client';
const response = await apiFetch('/api/endpoint');
```

#### Files that need updating:
- All files in `/src/app/dashboard/` directory
- Context providers (especially `brand-context.tsx`)
- Custom hooks that make API calls

### 2. Use the new `useCommonData` hooks

Instead of making direct API calls in components, use the centralized hooks:

```typescript
import { useCurrentUser, useMasterClaimBrands, useVettingAgencies } from '@/hooks/use-common-data';

// In your component
const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
const { data: masterClaimBrands, isLoading: isLoadingBrands } = useMasterClaimBrands();
const { data: vettingAgencies, isLoading: isLoadingAgencies } = useVettingAgencies();
```

Benefits:
- Automatic request deduplication
- Caching across components
- Consistent error handling
- Reduced API calls

### 3. Example: Fixing a Dashboard Page

Here's how to fix a typical dashboard page:

```typescript
// OLD CODE - Multiple useEffects with fetch
useEffect(() => {
  fetch('/api/me').then(res => res.json()).then(data => {
    setCurrentUser(data.user);
  });
}, []);

useEffect(() => {
  fetch('/api/master-claim-brands').then(res => res.json()).then(data => {
    setMasterClaimBrands(data.data);
  });
}, []);

// NEW CODE - Using hooks with deduplication
import { useCurrentUser, useMasterClaimBrands } from '@/hooks/use-common-data';

export default function MyDashboardPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { data: masterClaimBrands, isLoading: isLoadingBrands } = useMasterClaimBrands();
  
  if (isLoadingUser || isLoadingBrands) {
    return <LoadingSpinner />;
  }
  
  // Rest of your component
}
```

## Long-term Fixes

### 1. Implement Redis for Production Rate Limiting

See `/docs/INFRASTRUCTURE_REDIS_SETUP.md` for detailed instructions.

### 2. Adjust Rate Limits

Current limits are too strict for normal usage:

```typescript
// In /src/lib/rate-limit.ts
export const rateLimitConfigs = {
  // Increase general API limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 300, // Increased from 100
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down.',
  },
  
  // Consider different limits for authenticated users
  apiAuthenticated: {
    windowMs: 60 * 1000,
    max: 500, // Higher for logged-in users
    keyPrefix: 'api-auth',
  },
};
```

### 3. Implement Request Batching

For pages that need multiple endpoints, create batch endpoints:

```typescript
// New batch endpoint: /api/dashboard/init
export async function GET(request: NextRequest) {
  const [userData, brandsData, agenciesData] = await Promise.all([
    getUserData(userId),
    getBrandsForUser(userId),
    getVettingAgencies(),
  ]);
  
  return NextResponse.json({
    user: userData,
    brands: brandsData,
    agencies: agenciesData,
  });
}
```

## Monitoring and Prevention

### 1. Add Request Logging

```typescript
// In middleware.ts
if (request.nextUrl.pathname.startsWith('/api/')) {
  console.log(`API Request: ${request.method} ${request.nextUrl.pathname}`, {
    userId: request.headers.get('x-user-id'),
    timestamp: new Date().toISOString(),
  });
}
```

### 2. Track Rate Limit Hits

```typescript
// In middleware.ts
if (!rateLimitResult.allowed) {
  // Send to monitoring service
  await trackEvent('rate_limit_exceeded', {
    path: request.nextUrl.pathname,
    userId: request.headers.get('x-user-id'),
    limit: rateLimitConfig.max,
  });
}
```

### 3. Use React Query DevTools in Development

```typescript
// In app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </body>
    </html>
  );
}
```

## Quick Checklist

- [ ] Replace all `fetch` with `apiFetch` in dashboard pages
- [ ] Update `brand-context.tsx` to use `apiFetch`
- [ ] Implement `useCommonData` hooks for shared data
- [ ] Set up Redis for production (see Redis setup doc)
- [ ] Increase rate limits for authenticated users
- [ ] Add monitoring for rate limit violations
- [ ] Consider implementing batch endpoints for dashboard init

## Testing

After implementing fixes:

1. Check browser DevTools Network tab - should see fewer duplicate requests
2. Monitor rate limit headers in responses
3. Test with multiple users to ensure rate limits work correctly
4. Use load testing tools to verify new limits are appropriate