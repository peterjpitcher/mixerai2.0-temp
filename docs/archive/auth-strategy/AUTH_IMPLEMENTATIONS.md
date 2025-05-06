# Authentication Implementation Reference

This document provides a reference for all authentication-related implementations in the MixerAI 2.0 application, including API headers, token verification strategies, and debugging tools.

## API Authentication Headers

### Authentication Header Format

All protected API endpoints accept authentication via the following methods:

1. **Authorization Header (Primary Method)**
   ```
   Authorization: Bearer <jwt_token>
   ```

2. **Cookie-Based Fallback**
   When the Authorization header is missing, the system attempts to extract tokens from cookies:
   - `sb-auth-token` - Standard Supabase auth cookie
   - `debug-auth-token` - Fallback debug token cookie

### API Response Headers

API responses include the following headers for authentication debugging:

```
Access-Control-Allow-Origin: *
Cache-Control: no-store
x-data-source: [source of data, e.g., "database", "fallback", "mock-build-phase"]
```

## Authentication Verification Process

### Token Verification Flow

The API authentication flow is implemented in `src/lib/auth/api-auth.ts`:

1. During build phase, authentication is bypassed (to enable static site generation)
2. First attempt to verify the `Authorization` header
3. Fallback to cookie-based authentication if header is missing
4. Return 401 Unauthorized if both methods fail

```typescript
export async function verifyAuthToken(request: Request): Promise<boolean> {
  // Check build phase
  if (isBuildPhase()) return true;
  
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Verify token with Supabase
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (!error) return true;
  }
  
  // Fallback to cookie token
  const cookieToken = getTokenFromCookies(request);
  if (cookieToken) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(cookieToken);
    if (!error) return true;
  }
  
  return false;
}
```

### API Route Protection

API routes use the `checkAuthOrUnauthorized` helper to protect endpoints:

```typescript
export async function GET(request: Request) {
  // Check authentication
  const authResponse = await checkAuthOrUnauthorized(request);
  if (authResponse) return authResponse;
  
  // Continue with authorized request handling...
}
```

Some critical API routes like `/api/brands` implement advanced fallback methods:

```typescript
// Try standard auth check
const authResponse = await checkAuthOrUnauthorized(request);

// If there's an auth error but we have a cookie, try a fallback auth method
if (authResponse) {
  const cookieToken = getTokenFromCookies(request);
  if (cookieToken) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(cookieToken);
    if (!error && data.user) {
      // Continue with the request now that we're authenticated
    } else {
      return authResponse; // Return the original auth failure
    }
  } else {
    return authResponse;
  }
}
```

## Token Retrieval Logic

The front-end token retrieval logic is implemented in `src/lib/api-client.ts`:

### Client-Side Token Retrieval

The `getAuthToken()` function tries multiple sources in the following order:

1. **Supabase Session API**
   ```typescript
   const { data: sessionData } = await supabase.auth.getSession();
   if (sessionData?.session?.access_token) return sessionData.session.access_token;
   ```

2. **Session Refresh**
   ```typescript
   const { data: userData } = await supabase.auth.getUser();
   if (userData?.user) {
     const { data: refreshData } = await supabase.auth.refreshSession();
     if (refreshData?.session?.access_token) return refreshData.session.access_token;
   }
   ```

3. **localStorage Fallbacks**
   - Debug token: `localStorage.getItem('debug-auth-token')`
   - Supabase token: `localStorage.getItem('sb-xxx-auth-token')`
   - Legacy format: `localStorage.getItem('supabase.auth.token')`

4. **sessionStorage Fallback**
   - Check `sessionStorage` for `sb-xxx-auth-token`

### API Fetch Wrapper

All API calls should use the `fetchApi` wrapper which automatically adds authentication headers:

```typescript
export async function fetchApi(url: string, options: RequestInit = {}) {
  // Get the authentication token
  const token = await getAuthToken();
  
  // Set up headers with auth token
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make the request with auth headers
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 unauthorized errors with automatic retry
  if (response.status === 401) {
    const refreshedToken = await getAuthToken();
    if (refreshedToken && refreshedToken !== token) {
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      return fetch(url, { ...options, headers });
    }
  }
  
  return response;
}
```

## Cookie Authentication Logic

### Cookie Token Extraction

The cookie extraction logic is implemented in `getTokenFromCookies()`:

```typescript
export function getTokenFromCookies(request: Request): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  // Check for Supabase cookie
  const tokenCookie = cookies
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('sb-auth-token='));
  
  if (tokenCookie) {
    // Extract and decode the token value
    const tokenValue = tokenCookie.substring('sb-auth-token='.length);
    const decodedValue = decodeURIComponent(tokenValue);
    
    try {
      // Try parsing as JSON (it could be a stringified object)
      const tokenObj = JSON.parse(decodedValue);
      if (tokenObj.access_token) {
        return tokenObj.access_token;
      }
    } catch (e) {
      // Not JSON, use as is
      return decodedValue;
    }
  }
  
  // Check for debug token cookie
  const debugCookie = cookies
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('debug-auth-token='));
    
  if (debugCookie) {
    return debugCookie.substring('debug-auth-token='.length);
  }
  
  return null;
}
```

## Authentication Debugging Tools

Several debugging tools have been implemented to troubleshoot authentication issues:

### 1. Auth Token Checker Component

Located at `src/components/auth-token-checker.tsx`, this component provides:

- Scanning of localStorage/sessionStorage for auth tokens
- Testing API endpoints with current token
- Creating a debug token from current session
- Manual token input for testing

Usage:
```tsx
import { AuthTokenChecker } from '@/components/auth-token-checker';

// In your component
<AuthTokenChecker />
```

### 2. Direct API Tester Component

Located at `src/components/direct-api-tester.tsx`, this component:

- Tests API endpoints with various authentication methods
- Bypasses abstraction layers to identify where auth is failing
- Provides detailed error reporting

Usage:
```tsx
import { DirectApiTester } from '@/components/direct-api-tester';

// In your component
<DirectApiTester />
```

### 3. Auth Debug Button

Located at `src/components/auth-debug-button.tsx`, this provides:

- One-click auth status check
- Simplified reporting interface
- Shows token presence and API response

Usage:
```tsx
import { AuthDebugButton } from '@/components/auth-debug-button';

// In your component
<AuthDebugButton />
```

### 4. Auth Debug API Endpoint

Located at `src/app/api/auth-debug/route.ts`, this endpoint:

- Provides detailed authentication diagnostics
- Reports token validity and user information
- Shows request headers and authentication sources

Usage:
```typescript
const response = await fetch('/api/auth-debug', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
const data = await response.json();
```

### 5. Auth Check API Endpoint

Located at `src/app/api/auth-check/route.ts`, this endpoint:

- Verifies token validity
- Returns user information if authenticated
- Provides debugging data about token format and expiry

Usage:
```typescript
const response = await fetch('/api/auth-check', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
const data = await response.json();
```

### 6. Auth Debug Page

Located at `src/app/auth-debug/page.tsx`, this page:

- Shows comprehensive session information
- Tests all major API endpoints
- Provides detailed authentication diagnostics

Access at `/auth-debug` URL path.

## Debug Token Storage

The application provides debug token storage methods for easier authentication troubleshooting:

1. **localStorage Debug Token**
   ```javascript
   localStorage.setItem('debug-auth-token', token);
   ```

2. **Cookie Debug Token**
   ```javascript
   document.cookie = `debug-auth-token=${token}; path=/; max-age=3600`;
   ```

Both methods are handled automatically by the `AuthTokenChecker` component's "Store Token" button.

## Authentication Issues and Mitigations

The following issues have been identified and mitigations implemented:

1. **Session Persistence Issues**
   - **Problem**: Sessions established but not consistently accessible
   - **Mitigation**: Multiple token retrieval paths with fallbacks

2. **Token Expiry Problems**
   - **Problem**: Expired tokens causing 401 errors
   - **Mitigation**: Session refresh attempts when 401 errors are encountered

3. **Cookie Format Inconsistencies**
   - **Problem**: Cookie format doesn't match extraction logic
   - **Mitigation**: Enhanced cookie parsing with multiple format support

4. **API Header Formation**
   - **Problem**: Auth headers not consistently added
   - **Mitigation**: Centralized `fetchApi` wrapper for all requests 