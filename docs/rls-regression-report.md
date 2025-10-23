# Supabase RLS Regression Report

## Summary of Recent Changes

Over the last series of commits we hardened the Supabase integration and added abuse protections:

- **RLS hardening** – Enabled row-level security on all previously unsecured public tables and introduced the helper `public.require_aal2()` so global-admin actions require MFA (`supabase/migrations/20251104120000_enable_rls_and_mfa_hardening.sql`).
- **CAPTCHA integration** – Added Cloudflare Turnstile to login and password reset flows (`src/components/security/turnstile-challenge.tsx`, `src/app/api/auth/verify-captcha/route.ts`), updated email templates, and documented new environment variables.
- **Baseline policies for new RLS tables** – Added `public.has_brand_access()` and companion policies to keep legacy endpoints working under RLS (`supabase/migrations/20251104150000_add_policies_for_enabled_rls_tables.sql`).
- **Policy recursion fix (partial)** – Adjusted the policy on `user_system_roles` to avoid self-reference—users can now read their own rows without invoking another `is_global_admin()` call (`commit 1467abe`).

All changes are in `main` (commits `8a7fab8`, `96a60ab`, `1467abe`).

## Failure Symptoms in Production

Even after applying the latest migrations, production still returns HTTP 500 for:

- `GET https://mixerai.orangejelly.co.uk/api/me`
- `GET https://mixerai.orangejelly.co.uk/api/me/tasks`

Client symptoms include blank dashboards, login lockout fetch errors, and repeated `ApiClientError: Error fetching user session information`. The Turnstile widget itself responds, but downstream requests fail because the auth bootstrap fails.

## Server Log Snapshot

```
{
  "requestPath": "mixerai.orangejelly.co.uk/api/me",
  "responseStatusCode": -1,
  "message": "[API Error] Error fetching user session information {\n  message: 'infinite recursion detected in policy for relation \"user_brand_permissions\"',\n  code: '42P17'\n}"
}
```

The follow-up log entry confirms the error occurs when the API fetches brand permissions:

```
[API /me] Error fetching brand permissions: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "user_brand_permissions"'
}
```

## Root Cause

The legacy policy in `supabase/migrations/20250923121000_add_notification_settings_version.sql` now executes under RLS and recurses:

```sql
CREATE POLICY "Only brand admins can manage permissions"
ON "public"."user_brand_permissions"
TO "authenticated"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."user_brand_permissions" "ubp"
    WHERE ("ubp"."user_id" = "auth"."uid"())
      AND ("ubp"."brand_id" = "user_brand_permissions"."brand_id")
      AND ("ubp"."role" = 'admin')
  )
)
WITH CHECK (... identical subquery ...);
```

- Before RLS was enabled, selecting from `user_brand_permissions` bypassed policies, so recursion never occurred.
- Now every read or mutation executes this policy, which queries `user_brand_permissions` inside the policy body, causing PostgreSQL’s `42P17` “infinite recursion” error.

### Impacted call paths

`/api/me` → `createSupabaseServerClient()` → `.from('user_brand_permissions').select(...)`  
Because the policy triggers on this query, *all* authenticated API routes fail immediately.

## What Has Been Tried

1. **Enabled RLS and added `require_aal2`** – Success for MFA but exposed recursive policy.
2. **Baseline policies + helper** – Added `public.has_brand_access()` and read policies to keep features working; *however*, the recursion still exists because the legacy policy remained unchanged.
3. **Adjusted `user_system_roles` policy** – Removed recursion there, but `user_brand_permissions` still loops.

## Recommended Remediation

### Short-term (unblock production quickly)
1. Temporarily relax RLS on `user_brand_permissions` (e.g., `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`) **or** replace the problematic policy with a simple `USING (true)` until a safe helper is ready.
2. Verify `/api/me` and `/api/me/tasks` return 200s, and the dashboard renders.

### Longer-term (preferred solution)
1. Replace inline policy logic with a security-definer helper that runs without RLS.
2. Update policies to call the helper and restrict mutations to brand admins or global admins.
3. Ensure the helper function either `SET row_security = off` internally or relies on `SECURITY DEFINER` with a safe `search_path`.
4. Re-run Supabase type generation if schema signatures change.

### Latest Fix (2025-11-04)
- Added migration `20251104190000_harden_user_brand_permissions_rls.sql` that introduces a `user_is_brand_admin_safe` helper which temporarily turns off row security for the internal lookup to avoid recursion.
- Replaced the `user_brand_permissions` policies with versions that rely on the helper (and `public.is_global_admin()`), restoring brand admin capabilities without risking infinite recursion.

### Optional Structural Improvement
- Move admin mutations for brand permissions into a dedicated RPC or server action executed with the service-role key, keeping the table’s public RLS simple (`USING (user_id = auth.uid())`).

## Outstanding Questions for the Consultant

1. Preferred pattern for brand-access checks under RLS (security-definer helper vs. alternate schema)?
2. Acceptability of temporarily disabling RLS on `user_brand_permissions` to restore service while implementing the helper.
3. Guidance on auditing other policies that may self-query (e.g., any `EXISTS` subquery referencing the same table).

Once we have direction, I can implement the helper or alternate design and re-enable strict RLS safely.
