# CSRF Protection Audit Report

## Summary
This audit identifies API routes with mutation handlers (POST, PUT, PATCH, DELETE) that lack proper CSRF protection. CSRF (Cross-Site Request Forgery) protection is critical for preventing malicious websites from performing unauthorized actions on behalf of authenticated users.

## Critical Findings

### 1. Routes Using `withAuthAndMonitoring` (NO CSRF Protection)
These routes authenticate users but do not validate CSRF tokens:

- **`/api/brands/identity/route.ts`** - POST - Generates brand identity from URLs
- **`/api/content/generate/route.ts`** - POST - Generates content from templates
- **`/api/tools/alt-text-generator/route.ts`** - POST - Generates alt text for images
- **`/api/tools/content-transcreator/route.ts`** - POST - Transcreates content
- **`/api/tools/metadata-generator/route.ts`** - POST - Generates metadata
- **`/api/workflows/generate-description/route.ts`** - POST - Generates workflow descriptions

**Risk Level: HIGH** - These endpoints perform AI operations that consume resources and could be exploited for denial of service or unauthorized content generation.

### 2. Routes Using Only `withAuth` (NO CSRF Protection)
These routes authenticate users but do not validate CSRF tokens:

- **`/api/auth/check-reauthentication/route.ts`** - POST - Checks reauthentication status
- **`/api/auth/complete-invite/route.ts`** - POST - Completes user invitation process
- **`/api/auth/logout/route.ts`** - POST - Logs out users
- **`/api/upload/avatar/route.ts`** - POST - Uploads user avatars
- **`/api/upload/brand-logo/route.ts`** - POST - Uploads brand logos

**Risk Level: MEDIUM-HIGH** - Authentication and file upload endpoints are sensitive operations that should have CSRF protection.

### 3. Routes Using `withRouteAuth` or `withAdminAuth` (NO CSRF Protection)
These routes use custom auth wrappers without CSRF:

- **`/api/users/[id]/route.ts`** - PUT, DELETE - Updates or deletes user profiles
- **`/api/users/invite/route.ts`** - POST - Invites new users (admin only)

**Risk Level: HIGH** - User management operations are critical and should be protected.

### 4. Routes With No Authentication Wrapper
These routes have mutation handlers but no authentication or CSRF protection:

- **`/api/auth/cleanup-sessions/route.ts`** - POST - Cleans up expired sessions (uses basic auth header)
- **`/api/catch-all-error/[...path]/route.ts`** - POST, PUT, DELETE, PATCH - Error handler (returns 404)

**Risk Level: LOW** - These appear to be utility endpoints with limited risk.

### 5. Test/Debug Routes Without Protection
- **`/api/test-azure-openai/route.ts`** - POST
- **`/api/test-metadata-generator/route.ts`** - POST
- **`/api/test-template-generation/route.ts`** - POST
- **`/api/users/fix-role/route.ts`** - POST

**Risk Level: MEDIUM** - Test endpoints should be removed or protected in production.

## Recommendations

### Immediate Actions Required

1. **Replace `withAuthAndMonitoring` with `withAuthAndCSRF`** for all AI/content generation endpoints
2. **Replace `withAuth` with `withAuthAndCSRF`** for all mutation endpoints
3. **Update custom auth wrappers** (`withRouteAuth`, `withAdminAuth`) to include CSRF validation
4. **Remove or protect test endpoints** in production environments

### Code Changes Needed

For routes using `withAuthAndMonitoring`:
```typescript
// Replace
export const POST = withAuthAndMonitoring(async (request, user) => {

// With
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
export const POST = withAuthAndCSRF(async (request, user) => {
```

For routes using `withAuth`:
```typescript
// Replace
export const POST = withAuth(async (request, user) => {

// With
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
export const POST = withAuthAndCSRF(async (request, user) => {
```

For custom auth wrappers, ensure they incorporate CSRF validation internally.

## Priority Order

1. **Critical Priority**: User management routes (`/api/users/*`)
2. **High Priority**: AI/content generation routes
3. **Medium Priority**: Upload routes
4. **Low Priority**: Test/utility routes

## Additional Security Recommendations

1. Implement rate limiting on all AI endpoints to prevent resource exhaustion
2. Add request size limits on upload endpoints
3. Implement proper CORS headers to restrict cross-origin requests
4. Consider implementing double-submit cookie pattern as an additional layer
5. Add security headers (X-Frame-Options, Content-Security-Policy) to prevent clickjacking

## Verification Steps

After implementing CSRF protection:
1. Test that requests without CSRF tokens are rejected with 403 status
2. Verify that legitimate requests with valid tokens succeed
3. Test cross-origin requests are properly blocked
4. Ensure error messages don't leak sensitive information