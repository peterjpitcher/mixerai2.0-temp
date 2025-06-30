# CSRF Token Validation Issue Analysis

## Problem Description

When selecting a product in the content creation form, the application fails to fetch product context with a 403 Forbidden error. The server logs clearly indicate: "CSRF validation failed: No token in header"

### Error Details
- **Endpoint**: `POST /api/content/prepare-product-context`
- **Status Code**: 403 Forbidden
- **Error Message**: "CSRF validation failed: No token in header"
- **Location**: `src/hooks/use-content-generator.ts:201`

## Current Implementation

### Client-Side (After Initial Fix)
```typescript
// src/hooks/use-content-generator.ts
import { apiFetch } from '@/lib/api-client';

const response = await apiFetch('/api/content/prepare-product-context', {
  method: 'POST',
  body: JSON.stringify({
    brandId: selectedBrand,
    productId: value
  }),
  signal: abortController.signal
});
```

### Server-Side Protection
```typescript
// src/app/api/content/prepare-product-context/route.ts
export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  // Handler implementation
});
```

## Root Cause Analysis

**FOUND THE ISSUE**: The CSRF token cookie is being set with `httpOnly: true` in the middleware!

### The Problem

In `src/middleware.ts` (lines 124-134), the CSRF token cookie is being set incorrectly:

```typescript
response.cookies.set({
  name: 'csrf-token',
  value: csrfToken,
  httpOnly: true,  // ❌ THIS IS THE PROBLEM!
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});
```

The `httpOnly: true` flag prevents JavaScript from accessing the cookie via `document.cookie`. Since the `getCSRFToken()` function in `api-client.ts` tries to read the cookie using `document.cookie`, it always returns `null`.

### Why This Is Wrong

1. **CSRF tokens MUST be readable by JavaScript**: The whole point of CSRF tokens is for the client to read them and include them in request headers
2. **HttpOnly is for session cookies**: The HttpOnly flag is meant for sensitive cookies like session tokens that should never be accessible to JavaScript
3. **Security implications**: This doesn't make the CSRF protection more secure; it breaks it entirely

## Proposed Solutions

### Solution 1: Fix the HttpOnly Flag (IMMEDIATE FIX)
Remove the `httpOnly: true` flag from the CSRF token cookie in the middleware:

```typescript
// src/middleware.ts (lines 124-134)
response.cookies.set({
  name: 'csrf-token',
  value: csrfToken,
  httpOnly: false,  // ✅ Changed from true to false
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});
```

This is the simplest and most direct fix. CSRF tokens are meant to be read by JavaScript to be included in request headers.

### Solution 2: Alternative - Double Submit Cookie Pattern
If there's a concern about exposing the CSRF token, implement a double-submit cookie pattern with two cookies:

```typescript
// Set two cookies: one HttpOnly for validation, one readable for submission
response.cookies.set({
  name: 'csrf-token-secure',
  value: csrfToken,
  httpOnly: true,  // Server-side validation only
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});

response.cookies.set({
  name: 'csrf-token',
  value: csrfToken,
  httpOnly: false,  // Client-side readable
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});
```

Then update the validation to check both cookies match.

### Solution 3: Meta Tag Pattern (More Complex)
Include the CSRF token in a meta tag instead of relying on cookies:

```typescript
// In the root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const csrfToken = cookies().get('csrf-token')?.value;
  
  return (
    <html>
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Update getCSRFToken to check meta tag first
function getCSRFToken(): string | null {
  // Try meta tag first
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    return meta.getAttribute('content');
  }
  
  // Fall back to cookie
  // ... existing cookie logic
}
```

## Recommended Implementation Order

1. **Immediate**: Implement Solution 1 - Fix the HttpOnly flag
2. **Verification**: Test the fix thoroughly
3. **Optional Enhancement**: Consider Solution 2 (double-submit pattern) if additional security is needed

## The Fix

```typescript
// src/middleware.ts - Change line 129
httpOnly: false,  // Changed from true to false
```

That's it! This single-line change will fix the issue.

## Testing Plan

1. Apply the fix to `src/middleware.ts`
2. Restart the development server
3. Clear all cookies and local storage
4. Navigate to `/dashboard/content/new?template=...`
5. Check browser DevTools:
   - Application tab: Verify csrf-token cookie exists and is NOT HttpOnly
   - Console: Verify no CSRF errors when selecting a product
   - Network tab: Verify x-csrf-token header is sent with the request
6. Test product selection - it should work without 403 errors
7. Test after page refresh
8. Test in incognito mode

## Why This Fix Is Secure

1. **CSRF tokens are public by design**: They're not secrets; they're nonces that prove the request came from your site
2. **The security comes from validation**: The server validates that the token in the header matches the token in the cookie
3. **HttpOnly would be wrong here**: It's meant for session cookies, not CSRF tokens
4. **Industry standard**: Major frameworks (Django, Rails, Laravel) all use non-HttpOnly CSRF cookies

## Next Steps

1. Apply the one-line fix to `src/middleware.ts`
2. Test thoroughly
3. Consider adding integration tests for CSRF protection
4. Update any documentation about CSRF implementation