# 403 Error Investigation: Content Templates API

## Problem Summary

The `/api/content-templates/[id]` endpoint is returning a 403 error in production, but the response body contains plain text ("You don't...") instead of JSON, causing a JSON parsing error on the client side.

**Error Message:**
```
Failed to load resource: the server responded with a status of 403 ()
Error saving template: SyntaxError: Unexpected token 'Y', "You don't "... is not valid JSON
```

## ROOT CAUSE FOUND ✅

From the Vercel logs:
```
"message":"CSRF validation failed: No token in header"
```

The issue is **NOT** with permissions or Vercel interception. The PUT request is failing CSRF validation in the middleware because the client is not sending the `x-csrf-token` header.

## Investigation Steps Taken

### 1. API Error Handler Implementation
Created `src/lib/api-error-handler.ts` with:
- `createApiErrorResponse()` function that converts 403 to 401 (to avoid Vercel interception)
- Always returns JSON with proper headers
- Includes timestamp and structured error format

### 2. Middleware Updates
Modified `src/middleware.ts` to:
- Add `x-api-route` header for API routes
- Ensure JSON responses for rate limiting (429) errors
- Proper Content-Type headers for all API responses

### 3. API Route Updates
Updated `src/app/api/content-templates/[id]/route.ts`:
- Using `createApiErrorResponse()` for permission errors
- Added comprehensive debugging logs
- Ensures JSON response format

### 4. Additional Error Handling
Created:
- `src/app/api/_error.tsx` - Custom error page for API routes
- `src/app/api/catch-all-error/[...path]/route.ts` - Catch-all for 404s
- `src/app/api/error/route.ts` - Error testing endpoint

### 5. Vercel Configuration
Updated `vercel.json`:
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

## Current Hypothesis

Despite all these fixes, the 403 error is still returning plain text. This suggests:

1. **Vercel is intercepting the response at a layer above our application**
   - Vercel has built-in error pages for certain status codes
   - 403 Forbidden is one of the status codes Vercel intercepts
   - Our application code never gets a chance to handle the response

2. **The error might be happening before our middleware**
   - Authentication might be failing at the Supabase level
   - Vercel's edge functions might be rejecting the request

3. **The withAuth wrapper might not be handling errors correctly**
   - Need to check how `withAuth` handles unauthorized requests
   - It might be throwing an error that bypasses our error handlers

## Debugging Added

### Server-side (API Route):
```typescript
console.log('[DEBUG] Content Template GET Request:', {
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
  params,
  user: {
    id: user?.id,
    email: user?.email,
    role: user?.user_metadata?.role,
    metadata: user?.user_metadata
  },
  timestamp: new Date().toISOString()
});
```

### Client-side (Template Form):
```typescript
console.log('[DEBUG] Template Save Response:', {
  status: response.status,
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries()),
  url: response.url,
  ok: response.ok
});
```

### Diagnostic Script:
Created `scripts/diagnose-403-error.js` to:
- Test the endpoint with different authentication states
- Check response headers and content types
- Compare GET vs PUT requests

## Questions for Senior Developer

1. **Is there a Vercel-specific configuration that intercepts 403 responses?**
   - Are we using Vercel's Edge Middleware?
   - Is there a project-level setting in Vercel dashboard?

2. **How is the `withAuth` middleware implemented?**
   - Does it throw errors or return responses?
   - Can we see the implementation of `@/lib/auth/api-auth`?

3. **Are there any Vercel environment variables that affect error handling?**
   - `VERCEL_ENV`
   - Custom error page configurations

4. **Should we use a different status code?**
   - 401 Unauthorized instead of 403 Forbidden
   - Custom 4xx status codes (e.g., 418, 422)

5. **Is there a global error boundary or handler we're missing?**
   - Next.js error boundaries
   - Vercel-specific error handling

## Recommended Next Steps

1. **Check Vercel Dashboard**
   - Look for error page customization settings
   - Check function logs for the actual error
   - Review edge function configuration

2. **Test with Different Status Codes**
   - Try 401 instead of 403
   - Use non-standard 4xx codes

3. **Implement Response Interceptor**
   - Add a response interceptor in the client
   - Handle non-JSON responses gracefully

4. **Review withAuth Implementation**
   - Ensure it returns proper JSON responses
   - Check if it's throwing unhandled exceptions

5. **Add Telemetry**
   - Log to external service (e.g., Sentry)
   - Track where the plain text response originates

## Temporary Workaround

Until we solve the root cause, we could:
1. Always use 401 instead of 403 for API routes
2. Implement client-side error handling for non-JSON responses
3. Use a custom header to indicate the real status code

## Solution

The fix is simple - add the CSRF token to the request headers:

```typescript
// Get CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];

const response = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '', // Add CSRF token to headers
  },
  body: JSON.stringify(payload),
});
```

## Conclusion

The issue was not Vercel intercepting responses, but CSRF validation failing in the middleware. The middleware was correctly returning a 403 error, but the error response was not JSON formatted. The solution involves:

1. **Immediate fix**: Add CSRF token to the template form's PUT request
2. **Better error handling**: Ensure CSRF validation errors return JSON responses
3. **Client-side improvement**: Add a utility function to handle CSRF tokens for all API requests