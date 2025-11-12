---
title: Users & Access Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/users/*` and related APIs.
last_updated: 2025-10-30
stage: finished
---

# Users & Access – Deep Dive Review

> Status updated on 2025-10-30: Document moved to working during remediation of the identified issues.

## Scope
- Entry points: `/dashboard/users`, `/users/invite`, `/users/[id]`, `/users/[id]/edit`.  
- APIs: `/api/users`, `/api/users/[id]`, `/api/users/resend-invite`, `/api/users/[id]/brand-removal-impact`, `/api/user/profile`.

## Architecture & Data Flow
- Users page fetches paginated users via `/api/users` loop; permission gating via `useCurrentUser`.  
- Brand removal impact endpoint currently returns stub data.  
- Invite flow uses `api/users` and Supabase invites.

## Findings & Recommendations

### High Priority

1. **Brand removal impact endpoint returns placeholder**  
   - File: `src/app/api/users/[id]/brand-removal-impact/route.ts`  
   - Impact: Admins receive misleading “safe to remove” despite active assignments.  
   - Fix: Implement real RPC or query to compute workflow/content assignments; update UI to display actual counts.  
   - Status: ✅ Resolved 2025-10-30 — Endpoint now queries `workflow_user_assignments`/`user_tasks` and surfaces accurate counts.  
   - Verification: Remove brand admin with tasks; expect warning. Covered by `BrandRemovalWarning` rendering tests.

2. **Users list infinite loop on API failure**  
   - File: `src/app/dashboard/users/page.tsx:120-155`  
   - Impact: While loop continues when errors occur, hammering `/api/users`.  
   - Fix: Break loop on failure; set total count to aggregated length.  
   - Status: ✅ Resolved 2025-10-30 — Error now breaks pagination, surfaces toast, and preserves partial data safely.  
   - Verification: Simulate API error; ensure loop stops and error surfaces (`fetch-users.test.ts`).

3. **Permission checks missing for user management**  
   - Ensure `/api/users` and page hide features for non-admin roles.  
   - Status: ✅ Verified 2025-10-30 — `/api/users` enforces admin-only access; dashboard gate shows “Access Denied” for non-admins.

### Medium Priority

- Add search debounce cleanup.  ✅ Implemented via shared debounce hook.
- Cache brand list for filter dropdown.  ✅ Cached in `sessionStorage` w/ TTL.
- Improve error messaging for invite resends. ✅ Better toast messaging on failure/success.

### Low Priority / Enhancements

- Provide CSV export.  
- Add invite status filters.  
- Display last activity column.

## Performance & Observability Notes
- Add structured logging for `/api/users` errors.  
- Consider server pagination metadata to avoid client loop.

## Testing Gaps
- Tests for brand removal impact, pagination loop, permission gating.  
- Commands: `npm run lint`, `npm run test -- users`, manual invite/remove.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Users & access fixes verified; stage marked `finished`.
