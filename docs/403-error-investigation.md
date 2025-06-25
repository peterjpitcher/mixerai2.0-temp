# 403 Error Investigation: Content Templates API

**Summary:** Client requests were missing the `x-csrf-token` header, causing CSRF validation failures and plain-text 403 responses.

## Problem Summary

The `/api/content-templates/[id]` endpoint is returning a 403 error in production, but the response body contains plain text ("You don't...") instead of JSON, causing a JSON parsing error on the client side.

**Error Message:**
```
Failed to load resource: the server responded with a status of 403 ()
Error saving template: SyntaxError: Unexpected token 'Y', "You don't "... is not valid JSON
```

## Investigation Timeline

| Date-Time | Action | Outcome |
|-----------|---------|----------|
| 2025-06-20 09:00 | Initial error logged | JSON parsing error on 403 responses |
| 2025-06-20 10:30 | Created API error handler | Implemented `createApiErrorResponse()` |
| 2025-06-20 14:00 | Updated middleware | Added JSON response headers |
| 2025-06-21 09:15 | Modified API routes | Added debugging logs |
| 2025-06-21 15:30 | Deployed Vercel config | Updated `vercel.json` with rewrites |
| 2025-06-22 11:00 | Created diagnostic scripts | Built testing tools |
| 2025-06-25 14:25 | Production logs analysed | CSRF token issue confirmed |
| 2025-06-25 16:00 | Root cause identified | Missing `x-csrf-token` header |

## ROOT CAUSE FOUND ✅

The issue is **NOT** with permissions or Vercel interception. The PUT request is failing CSRF validation in the middleware because the client is not sending the `x-csrf-token` header.

## Definitive Fix

The fix requires adding the CSRF token to request headers:

```typescript
// Create reusable helper function
function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1] || '';
}

// Use in API requests
const response = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': getCsrfToken(), // Add CSRF token to headers
  },
  body: JSON.stringify(payload),
});
```

**Recommended location for helper:** `src/lib/utils/csrf.ts`

## Production Log Confirmation

### Log Analysis (2025-06-25 14:25)

Production logs from Vercel confirm the root cause:

```
middleware: {
  "timestamp": "2025-06-25 14:25:23",
  "path": "/api/content-templates/28893",
  "method": "PUT",
  "userId": "17cf96ac-e12f-4962-85d6-2ad4bdc476d7",
  "message": "CSRF validation failed: No token in header"
}
```

Key findings:
1. **Confirmed CSRF Token Issue**: Log shows **`"message": "CSRF validation failed: No token in header"`**
2. **User is Authenticated**: Valid `userId` present, confirming authentication works
3. **Missing Header**: No `x-csrf-token` in request headers
4. **Middleware Working**: Properly validating CSRF tokens and returning 403

## Recommended Next Steps

### Immediate Actions (Dev team - target EOD today)
- Implement `getCsrfToken()` utility in `src/lib/utils/csrf.ts`
- Update all PUT/POST/DELETE requests to include CSRF token
- Test fix in staging environment

### Error Handling Improvements (Backend team - this week)
- Ensure CSRF validation errors return JSON responses
- Add proper error formatting in middleware
- Implement consistent error response structure

### Monitoring Setup (Ops team - this sprint)
- Add Sentry integration for error tracking
- Set up alerts for 403 errors
- Monitor CSRF validation failure rates

### Documentation Updates (Tech lead - after fix confirmed)
- Update API documentation with CSRF requirements
- Add CSRF token handling to onboarding docs
- Create troubleshooting guide for common errors

### Interim Workaround (until fix deployed)
1. Retry failed requests with exponential backoff
2. Implement client-side error handling for non-JSON responses:
   ```typescript
   try {
     const data = await response.json();
   } catch (e) {
     if (response.status === 403) {
       // Handle CSRF failure gracefully
       console.error('CSRF validation failed');
     }
   }
   ```

## Key Takeaways

- **CSRF failures return plain text** if not properly handled in middleware
- **Vercel does not auto-intercept 403** responses in this configuration
- **Always include `x-csrf-token`** header on mutating requests (PUT/POST/DELETE)
- **User authentication ≠ CSRF protection** - both are required

## Appendix: Essential Log Fields

<details>
<summary>Click to expand key log fields</summary>

```json
{
  "timestamp": "2025-06-25 14:25:23",
  "path": "/api/content-templates/28893",
  "method": "PUT",
  "userId": "17cf96ac-e12f-4962-85d6-2ad4bdc476d7",
  "headers": {
    "content-type": "application/json",
    "origin": "https://content.mixer.gg"
  },
  "message": "CSRF validation failed: No token in header"
}
```

Note: Full request headers available in Vercel dashboard; `x-csrf-token` notably absent.

</details>