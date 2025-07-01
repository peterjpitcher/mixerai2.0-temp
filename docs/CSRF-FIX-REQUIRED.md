# 🚨 CRITICAL FIX REQUIRED: CSRF Token Issue

## The Bug
CSRF token validation is failing because the token cookie is set with `httpOnly: true`, preventing JavaScript from reading it.

## The Fix
In `src/middleware.ts`, line 129:

```diff
- httpOnly: true,
+ httpOnly: false,
```

## Why It's Happening
1. The middleware sets the CSRF token cookie with `httpOnly: true`
2. The client-side `apiFetch` tries to read the cookie with `document.cookie`
3. HttpOnly cookies cannot be read by JavaScript
4. Therefore, the CSRF token is never included in requests
5. Server rejects requests with "CSRF validation failed: No token in header"

## Impact
- All POST/PUT/DELETE requests fail with 403 Forbidden
- Users cannot create content, update profiles, or perform any mutations
- The application is effectively broken for all write operations

## Security Note
- CSRF tokens are MEANT to be readable by JavaScript
- The security comes from server-side validation, not from hiding the token
- HttpOnly is for session cookies, NOT for CSRF tokens
- This is standard practice across all major web frameworks

## Action Required
1. Apply the one-line fix above
2. Test that product selection works
3. Verify CSRF protection still functions correctly

See `csrf-token-issue-analysis.md` for full details.