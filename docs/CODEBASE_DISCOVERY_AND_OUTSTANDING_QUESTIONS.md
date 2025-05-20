# Codebase Discovery and Outstanding Questions

Date: May 21, 2024 (Placeholder, update with actual date)

## 1. Introduction

This document outlines the findings from a codebase discovery phase initiated to diagnose and resolve issues related to user authentication, session management, and role-based access, specifically focusing on a `ReadonlyRequestCookiesError` in `src/middleware.ts` and inconsistent side navigation visibility for admin users.

## 2. Key Dependencies (from `package.json`)

-   `@supabase/ssr`: `^0.0.10`
-   `@supabase/supabase-js`: `^2.39.0`
-   `@supabase/auth-helpers-nextjs`: `^0.10.0` (Present, but primary SSR auth seems to be via `@supabase/ssr`)
-   `next`: `14.2.28`

## 3. Analysis of `src/middleware.ts`

The `ReadonlyRequestCookiesError` originates from the Supabase client initialization within `src/middleware.ts`.

**File Content Snippet (Illustrative of the issue):**
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers'; // problemática

// ...
    const cookieStore = cookies(); // From 'next/headers' - this is read-only for requests
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: { /*...*/ }) {
            // ERROR HERE: cookieStore is from request, cannot be set.
            cookieStore.set(name, value, options); 
          },
          remove(name: string, options: { /*...*/ }) {
            // ERROR HERE: cookieStore is from request, cannot be set.
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
// ...
```

**Root Cause of `ReadonlyRequestCookiesError`:**
The `cookies()` function imported from `next/headers` provides a read-only collection of the incoming request's cookies. The `set` and `remove` methods within the Supabase client's cookie handler are attempting to write to this read-only store. Cookie modifications in Next.js middleware must be made on the `NextResponse` object.

**Expected Fix:**
The cookie handlers (`set`, `remove`) provided to `createServerClient` in the middleware need to be rewritten to modify `response.cookies` (where `response` is an instance of `NextResponse`) instead of `request.cookies`.

## 4. Supabase Client Instantiation Patterns

-   **`@supabase/ssr` (`createServerClient`)**:
    -   Used in `src/middleware.ts` (current source of cookie error).
    -   Also found in `src/lib/supabase/server.ts`, `src/lib/auth/server.ts`, `src/lib/auth/route-handlers.ts`, `src/lib/auth/api-auth.ts`. These usages need to be reviewed to ensure they correctly handle cookie operations for their respective contexts (Server Components, Route Handlers).
-   **`@supabase/ssr` (`createBrowserClient`)**:
    -   Used appropriately in various client-side page components (e.g., `AccountPage`, `ContentPageClient`).
-   **`@supabase/supabase-js` (`createClient`)**:
    -   Used directly in `src/app/api/env-check/route.ts`, test files, and seed scripts. Generally acceptable for non-user-session-dependent server-side operations or scripts.
-   **`@supabase/auth-helpers-nextjs`**:
    -   Primarily referenced in documentation files. Its actual usage in `src/` code seems minimal or non-existent based on initial greps, suggesting a transition to `@supabase/ssr`. The presence in `package.json` should be noted.

## 5. `user_system_roles` Table Analysis

-   **Existence:** The table `user_system_roles` exists in the database schema (evidenced by `src/types/supabase.ts`).
-   **Data:**
    -   User `33d292a7-0e06-4125-ab88-943e8844b7d7` (who currently sees the sidenav) has an entry in this table with a `superadmin` role.
    -   User `8c03d136-306d-48a9-b0d5-4a48fcf45c81` (who currently does not see the sidenav, and was previously affected by RLS errors) is *not* present in `user_system_roles`.
    -   Both users have `"role": "admin"` in their `raw_user_meta_data` (JWT claims).
-   **Hypothesis:** The visibility of the sidenav (and potentially other permissions) might be dependent not just on the JWT's `user_metadata.role`, but also on the presence of a specific role (e.g., `superadmin`) in the `user_system_roles` table. The `/api/me` route or client-side logic consuming its data likely queries or considers this table. This could explain why one 'admin' user sees the nav and the other doesn't, *after* the RLS errors were fixed.

## 6. RLS Policy Status

-   The previous primary issue, PostgreSQL error `22023: role "admin" does not exist` (indicating a JSON parsing failure in RLS policies), appears to be **resolved** by the applied migration (`YYYYMMDDHHMMSS_make_rls_safer.sql`). This migration introduced `public.get_current_user_role()` to safely parse JWT metadata.
-   The absence of this specific database error in the latest logs supports this conclusion.

## 7. Outstanding Questions & Areas for Further Discovery

1.  **`src/middleware.ts` - Precise Fix:** While the cause of the cookie error is identified, the exact, correct implementation using `response.cookies.set()` within the Supabase client handlers in middleware needs to be implemented.
2.  **`user_system_roles` Integration:**
    -   How and where is the `user_system_roles` table queried and its data used in the application logic (especially in `/api/me` and any subsequent permission handling for UI elements like the sidenav)?
    -   What is the intended distinction between a user with `user_metadata.role: "admin"` and a user with `user_system_roles.role: "superadmin"`?
    -   Does the "no sidenav" issue for user `8c03d136...` stem from them lacking a `superadmin` role in `user_system_roles`, assuming the middleware cookie issue is resolved and they get a valid session?
3.  **Other Supabase Server Client Usages:** Review instances of `createServerClient` in `src/lib/` to ensure they correctly implement cookie handling if they are involved in session management that could lead to cookie writes (e.g., in Route Handlers that might refresh tokens).
4.  **Impact of `@supabase/auth-helpers-nextjs`:** Confirm if this package is truly unused in `src/` and can be considered for removal to avoid confusion, or if it serves a purpose not yet identified.

## 8. Next Steps (Proposed)

1.  **Fix `src/middleware.ts`:** Correct the Supabase client cookie handling to use `response.cookies` as per `@supabase/ssr` best practices for Next.js middleware.
2.  **Investigate `user_system_roles` Usage:**
    -   Read the code for `/api/me/route.ts`.
    -   Search the codebase for queries to `user_system_roles`.
    -   Determine how this role influences `currentUser` object structure or navigation logic.
3.  **Address Sidenav Inconsistency:** Based on findings from (1) and (2), implement necessary changes so that users with `raw_user_meta_data.role: "admin"` (like `8c03d136...`) have the expected navigation access, clarifying the role of `user_system_roles`.
4.  **Review and Cleanup:** Verify other server-side Supabase client usages and consider removing unused `auth-helpers-nextjs` if confirmed.
5.  **Update Main Documentation:** Append a summary of this discovery and the resolution plan to `DOCUMENTATION.md`.

This document will be updated as more information is gathered and issues are resolved. 