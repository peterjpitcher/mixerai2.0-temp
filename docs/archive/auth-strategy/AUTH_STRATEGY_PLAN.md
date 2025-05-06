# Authentication Strategy Plan (Revised)

## Current State Analysis

The MixerAI 2.0 application is experiencing persistent authentication issues, particularly with API requests returning 401 Unauthorized errors. Based on error logs and code analysis, we've identified several key issues:

1. **Auth Flow Issues:**
   - Authorization headers are not consistently included in API requests
   - Cookie fallback authentication is not working effectively
   - Token storage and retrieval is fragmented across multiple methods
   - Session state is not consistently maintained

2. **Token Storage and Retrieval:**
   - Multiple token storage mechanisms (localStorage, sessionStorage, cookies)
   - Inconsistent token format and validation
   - Expired tokens not properly detected or refreshed
   - Debug tokens not consistently applied

3. **Cookie Implementation:**
   - Cookies may have incorrect configuration (SameSite, path, domain)
   - Cookie values not properly encoded or decoded
   - Cookie fallback mechanism not reliably retrieving tokens

4. **Infrastructure:**
   - Supabase client initialization and configuration may be inconsistent
   - Session provider not properly syncing with authentication state
   - Token refresh mechanisms not functioning correctly

## Root Causes

1. **Cookie Configuration Issues:**
   - Cookie format doesn't match what `getTokenFromCookies()` is expecting
   - LocalStorage tokens aren't being mirrored to cookies consistently
   - Debug cookies may have incorrect domain or path settings

2. **Session Persistence:**
   - Session is established but not consistently accessible across page navigations
   - Token expiration handling may be causing intermittent failures

3. **Auth Header Formation:**
   - The API client is failing to include the auth token in requests
   - The format "Bearer {token}" may not be consistently applied

4. **Cross-Component Communication:**
   - Auth state changes in one component may not propagate correctly to others
   - Session refreshes may not update all stored tokens

## Revised Strategic Plan

After receiving feedback from senior developers, we're revising our approach to leverage Supabase's official auth helpers and Next.js patterns instead of building custom solutions.

### 1. Adopt Supabase's SSR Package Instead of Custom TokenService

**Objective:** Replace custom token handling with Supabase's officially supported server-side auth package

**Actions:**
1. Install and configure `@supabase/ssr` package
2. Remove custom token storage/retrieval code
3. Configure Supabase client with proper SSR settings
4. Let Supabase handle cookie management securely

```typescript
// Install required packages
// npm install @supabase/supabase-js @supabase/ssr

// Replace custom TokenService with Supabase's built-in auth
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Automatic session management
const { data: { session } } = await supabase.auth.getSession()
```

**Benefits:**
- Uses httpOnly, secure, SameSite cookies by default
- Handles token refresh automatically
- Properly secures authentication data
- Maintained by Supabase team for security updates

### 2. Implement Next.js Middleware for Route Protection

**Objective:** Use Next.js Middleware with Supabase helpers for consistent auth protection

**Actions:**
1. Create middleware.ts file with Supabase auth client
2. Configure route matchers for protected routes
3. Implement automatic session refresh
4. Remove custom API route auth wrappers

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // This refreshes the session if needed
  const { data: { session } } = await supabase.auth.getSession()
  
  // Optional: redirect unauthenticated users
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  
  return res
}

// Define which routes to protect
export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

**Benefits:**
- Centralized auth protection for all routes
- Automatic token refresh on each request
- Configurable per-route protection patterns
- Efficient middleware-based approach

### 3. Use Appropriate Supabase Clients for Each Context

**Objective:** Use context-specific Supabase clients for different parts of the application

**Actions:**
1. Implement Server Component client for SSR pages
2. Implement Route Handler client for API routes
3. Implement Client Component hooks for browser-side interactions
4. Replace custom fetch interceptors

```typescript
// Server Component usage
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data } = await supabase.from('brands').select()
  return (
    <div>
      {/* Render using data */}
    </div>
  )
}

// API Route Handler usage
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data } = await supabase.from('brands').select()
  return Response.json({ success: true, brands: data })
}

// Client Component usage with hooks
'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function BrandsList() {
  const [brands, setBrands] = useState([])
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase.from('brands').select()
      setBrands(data)
    }
    fetchBrands()
  }, [supabase])
  
  return (
    <ul>
      {brands.map(brand => (
        <li key={brand.id}>{brand.name}</li>
      ))}
    </ul>
  )
}
```

**Benefits:**
- Context-appropriate clients for optimal performance
- Automatic auth token handling in each environment
- Properly typed data access
- No need for custom fetch interceptors

### 4. Eliminate Client-Side Token Storage

**Objective:** Remove insecure client-side token storage for better security

**Actions:**
1. Remove all localStorage/sessionStorage token storage
2. Replace with Supabase cookie-based auth
3. Use in-memory session state for client components
4. Remove custom event dispatching for tokens

```typescript
// BEFORE: Insecure token storage
localStorage.setItem('auth-token', token)
sessionStorage.setItem('auth-token', token)

// AFTER: Use Supabase session management
// In a client component
const supabase = createClientComponentClient()
const { data: { session } } = await supabase.auth.getSession()

// To access user info when needed
const user = session?.user
```

**Benefits:**
- Eliminates XSS vulnerability risk from localStorage
- Uses httpOnly cookies that JavaScript can't access
- Automatic refresh built into the system
- Simplified code with fewer security risks

### 5. Simplify API Protection

**Objective:** Standardize API route protection using Supabase's built-in verification

**Actions:**
1. Create a standardized API route wrapper
2. Use Supabase's JWT verification
3. Implement consistent error responses
4. Apply to all API routes

```typescript
// api-auth.ts - Our simplified auth wrapper
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export function withAuth(handler) {
  return async (req) => {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    
    // Call the handler with the authenticated user
    return handler(req, user)
  }
}

// Using in an API route
export const GET = withAuth(async (req, user) => {
  // Authenticated request handling
  return Response.json({ success: true, data: "Protected data" })
})
```

**Benefits:**
- Leverages Supabase's built-in JWT verification
- Handles token decoding and expiry automatically
- Provides consistent error responses
- Simplifies API route code

### 6. Implement Monitoring via Supabase Tools

**Objective:** Use Supabase's built-in monitoring instead of custom solutions

**Actions:**
1. Set up Supabase auth webhooks for auth events
2. Utilize Supabase Dashboard for auth logs
3. Implement RPC functions for custom logging
4. Connect to external monitoring if needed

```typescript
// Server-side logging using Supabase RPC
const logAuthEvent = async (event, metadata) => {
  const supabase = createRouteHandlerClient({ cookies })
  await supabase.rpc('log_auth_event', { 
    event_type: event,
    event_data: metadata 
  })
}

// Setting up an auth webhook in Supabase
// 1. Go to Supabase Dashboard > Auth > URL Configuration
// 2. Set webhooks for events like signin, signup, etc.
```

**Benefits:**
- Centralized logging in the database
- Built-in auth event monitoring
- Easier integration with external tools
- No custom monitoring code to maintain

### 7. Enforce Row-Level Security (RLS) Policies

**Objective:** Secure database tables with RLS policies to protect data even if API routes are bypassed

**Actions:**
1. Enable RLS on all public tables
2. Create specific policies based on user roles and permissions
3. Test policies by impersonating different users
4. Document all policies for future reference

```sql
-- Example RLS policy for Brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Users can read their own brands
CREATE POLICY brands_select_own ON brands
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can update their own brands
CREATE POLICY brands_update_own ON brands
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own brands
CREATE POLICY brands_delete_own ON brands
  FOR DELETE
  USING (auth.uid() = created_by);

-- Super admins can read all brands
CREATE POLICY brands_select_admin ON brands
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_super_admin = true));
```

**Benefits:**
- Adds database-level security independent of API implementation
- Prevents unauthorized data access even if API validation is bypassed
- Centralizes access control logic in the database
- Provides consistent security rules across all application components

### 8. Lock Down Environment Variables & Secrets

**Objective:** Ensure sensitive credentials are never exposed to the client

**Actions:**
1. Audit all environment variables and move sensitive ones to server-only contexts
2. Ensure SUPABASE_SERVICE_ROLE_KEY is never exposed to the client
3. Use Next.js server-only environment variables (without NEXT_PUBLIC_ prefix)
4. Implement Supabase functions secrets for serverless endpoints

```typescript
// ❌ INCORRECT: Never use sensitive keys on the client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! // SECURITY RISK!
)

// ✅ CORRECT: Only use service role in server contexts
// Server component, API route, or middleware
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-only environment variable
)

// For Supabase Edge Functions (if used)
// Use Supabase secrets management:
// supabase secrets set SERVICE_API_KEY=sk_12345
```

**Benefits:**
- Prevents accidental leakage of admin credentials
- Separates client and server authorization contexts
- Uses platform-appropriate secret management
- Reduces risk of privilege escalation attacks

### 9. Plan a Smooth Migration Path

**Objective:** Ensure a seamless transition from custom auth to Supabase auth helpers

**Actions:**
1. Create a comprehensive inventory of current auth mechanisms
2. Back-populate any required profile data
3. Implement a staged migration with feature flags
4. Plan for rollback capability if issues arise

```typescript
// Example of staged migration with feature flags
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useFlags } from '@/lib/feature-flags'

export function AuthProvider({ children }) {
  const { useNewAuthSystem } = useFlags()
  
  if (useNewAuthSystem) {
    // New Supabase auth helpers approach
    const supabase = createClientComponentClient()
    // ...rest of new implementation
  } else {
    // Legacy custom auth approach (to be removed after migration)
    // ...existing implementation
  }
  
  return <>{children}</>
}

// SQL migration for back-population
// Example SQL to sync any custom profiles with auth.users
INSERT INTO profiles (id, email, display_name, avatar_url)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

**Benefits:**
- Reduces risk of login disruptions during migration
- Provides clean rollback path if issues arise
- Ensures data consistency between auth and app tables
- Allows for gradual user transition

### 10. Add Automated & Manual Tests

**Objective:** Ensure authentication system reliability through comprehensive testing

**Actions:**
1. Implement unit tests for auth wrappers and middleware
2. Create integration tests for authentication flows
3. Build RLS policy tests with user impersonation
4. Set up CI/CD pipeline to run tests on each commit

```typescript
// Example unit test for auth middleware
import { createMocks } from 'node-mocks-http'
import { middleware } from '@/middleware'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: jest.fn().mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      })
    }
  })
}))

describe('Auth Middleware', () => {
  it('allows authenticated users to access protected routes', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/dashboard/brands'
    })
    
    const response = await middleware(req)
    expect(response.status).not.toBe(401)
  })
})

// Example RLS policy test
describe('Brands RLS Policies', () => {
  it('prevents users from accessing others brands', async () => {
    // Setup test user
    const userId = 'test-user-id'
    const otherUserId = 'other-user-id'
    const adminClient = createSupabaseAdminClient()
    
    // Create test data
    await adminClient.from('brands').insert([
      { id: 'brand1', name: 'User Brand', created_by: userId },
      { id: 'brand2', name: 'Other Brand', created_by: otherUserId }
    ])
    
    // Impersonate user and test policy
    const { data: brands } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: 'test@example.com'
    }).then(() => {
      return adminClient.from('brands').select('*')
    })
    
    // Should only return the user's own brand
    expect(brands).toHaveLength(1)
    expect(brands[0].id).toBe('brand1')
  })
})
```

**Benefits:**
- Catches authentication regressions early
- Verifies RLS policies are correctly implemented
- Ensures consistent auth behavior across API routes
- Provides confidence during refactoring and updates

### 11. Monitor & Alert on Auth Metrics

**Objective:** Detect authentication issues before they impact many users

**Actions:**
1. Implement APM tools (Sentry, Datadog) for auth monitoring
2. Set up alerting for authentication failure spikes
3. Track key metrics like login success rate and token refresh success
4. Establish baseline metrics and trigger alerts on deviations

```typescript
// Example Sentry monitoring implementation
import * as Sentry from '@sentry/nextjs'

export function withAuthAndMonitoring(handler) {
  return async (req) => {
    // Start monitoring transaction
    const transaction = Sentry.startTransaction({
      name: `API: ${req.nextUrl.pathname}`,
      op: 'auth.verify'
    })
    
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // Log auth failure with context
        Sentry.captureException(error, {
          tags: {
            path: req.nextUrl.pathname,
            error_type: 'auth_failure',
            error_code: error.code
          }
        })
        return Response.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Call the handler with the authenticated user
      return handler(req, user)
    } catch (err) {
      Sentry.captureException(err)
      return Response.json(
        { success: false, error: 'Server error' },
        { status: 500 }
      )
    } finally {
      transaction.finish()
    }
  }
}
```

**Benefits:**
- Proactive detection of auth issues before widespread user impact
- Historical data for debugging intermittent problems
- Clear visibility into auth performance trends
- Real-time alerting for immediate response

### 12. Use Feature Flags for Gradual Rollout

**Objective:** Safely deploy auth changes with controlled exposure and fast rollback capability

**Actions:**
1. Implement a feature flag system (LaunchDarkly, ConfigCat, or custom)
2. Create flags for each major auth component
3. Plan for gradual percentage-based rollout
4. Integrate with monitoring for automatic rollbacks

```typescript
// Example feature flag implementation for auth system
import { useState, useEffect } from 'react'
import { getFeatureFlag } from '@/lib/feature-flags'

export function useAuthFlags() {
  const [flags, setFlags] = useState({
    useNewAuthFlow: false,
    useRlsProtection: false,
    useNewMiddleware: false,
    useSessionRefresh: false
  })
  
  useEffect(() => {
    async function loadFlags() {
      const [
        useNewAuthFlow,
        useRlsProtection,
        useNewMiddleware,
        useSessionRefresh
      ] = await Promise.all([
        getFeatureFlag('use-new-auth-flow'),
        getFeatureFlag('use-rls-protection'),
        getFeatureFlag('use-new-middleware'),
        getFeatureFlag('use-session-refresh')
      ])
      
      setFlags({
        useNewAuthFlow,
        useRlsProtection,
        useNewMiddleware,
        useSessionRefresh
      })
    }
    
    loadFlags()
  }, [])
  
  return flags
}

// Rollout plan in feature flag system:
// - Week 1: 5% of users
// - Week 2: 20% of users
// - Week 3: 50% of users
// - Week 4: 100% of users
```

**Benefits:**
- Enables gradual, controlled rollout of auth changes
- Provides instant rollback capability if issues arise
- Allows testing with subset of real users before full deployment
- Reduces risk of widespread authentication failures

### 13. Sanity-Check Caching & ISR

**Objective:** Ensure dynamic content requiring authentication is never incorrectly cached

**Actions:**
1. Audit all pages with authentication requirements
2. Ensure proper cache control headers for authenticated content
3. Use appropriate Next.js caching directives
4. Implement user-specific cache keys where needed

```typescript
// For pages requiring authentication, use:
export const dynamic = 'force-dynamic'

// Or in app router RSC pages:
import { unstable_noStore as noStore } from 'next/cache'

export default async function AuthenticatedPage() {
  // Opt out of caching for this component
  noStore()
  const supabase = createServerComponentClient({ cookies })
  // ...fetch user-specific data
}

// For API routes with auth:
export async function GET(request) {
  // Set no-cache headers
  const headers = new Headers()
  headers.set('Cache-Control', 'no-store, max-age=0')
  
  // Auth check and response
  const supabase = createRouteHandlerClient({ cookies })
  const { data } = await supabase.auth.getUser()
  
  if (!data.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers }
    )
  }
  
  return new Response(
    JSON.stringify({ data: 'Protected data' }),
    { status: 200, headers }
  )
}
```

**Benefits:**
- Prevents accidental exposure of one user's data to another
- Ensures authentication checks are always performed
- Avoids stale authentication state in cached responses
- Maintains proper security boundaries in distributed systems

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
- Install and configure `@supabase/ssr` package
- Implement Next.js Middleware for route protection
- Remove localStorage/sessionStorage token storage
- Update session provider to use Supabase session
- Lock down environment variables and secrets
- Enable basic RLS policies on critical tables

**Deliverables:**
- Configured Supabase SSR auth package
- Middleware implementation for route protection
- Secure cookie-based authentication
- Environment variable security audit report
- Initial RLS policy documentation

### Phase 2: Client Integration (Week 3-4)
- Implement context-specific Supabase clients
- Update client components to use Supabase hooks
- Create route handler wrappers for API endpoints
- Add standardized error handling
- Set up monitoring and alerting infrastructure
- Implement feature flag system for rollout

**Deliverables:**
- Updated Server Component authentication
- Updated Route Handler authentication
- Updated Client Component authentication
- Monitoring dashboard and alerts
- Feature flag configuration

### Phase 3: API Standardization & Testing (Week 5-6)
- Apply withAuth wrapper to all API routes
- Implement consistent error responses
- Add fallback methods for special cases
- Create comprehensive authentication documentation
- Implement automated testing suite
- Complete RLS policies for all tables

**Deliverables:**
- Standardized API authentication
- API error handling documentation
- Authentication flow documentation
- Test coverage report
- Complete RLS policy documentation

### Phase 4: Rollout & Optimization (Week 7-8)
- Configure feature flags for gradual rollout
- Perform cache configuration audit
- Implement back-population for profile data
- Create auth status dashboard
- Perform comprehensive security audit
- Complete final rollout to 100% of users

**Deliverables:**
- Rollout success metrics
- Cache audit report
- Security audit report
- Performance optimization recommendations
- Migration completion report

## Short-term fixes

While implementing the strategic plan, here are immediate fixes that can be applied to resolve current authentication issues:

1. **Update Cookie Configuration**:
   - Replace custom cookie handling with Supabase's built-in approach
   - Add `SameSite=Lax` attribute for better compatibility in the interim
   - Ensure all cookies are properly encoded

2. **Fix Token Retrieval**:
   - Add a quick Supabase session check before custom token retrieval
   - Simplify the token retrieval logic to focus on most reliable sources first
   - Add better error handling for common token issues

3. **Improve API Requests**:
   - Add consistent auth header formatting to all fetch calls
   - Implement a simple fetch wrapper for immediate auth header inclusion
   - Add basic request retry logic for 401 errors

4. **Update Session Provider**:
   - Connect session provider directly to Supabase auth state
   - Implement a more aggressive session refresh approach 
   - Add session validation on critical routes

5. **Quick RLS Implementation**:
   - Add basic RLS policies to critical tables (brands, content)
   - Implement simple "owner-only" access for user-created resources
   - Test with multiple user accounts to verify proper data isolation

6. **Environment Variable Audit**:
   - Immediately move service role key to server-only context
   - Verify no sensitive keys are exposed in client bundles
   - Set up proper secrets management for deployment environments

These immediate fixes will stabilize the application while we implement the more comprehensive strategic plan. 