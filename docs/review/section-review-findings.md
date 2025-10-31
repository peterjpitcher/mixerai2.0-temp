---
title: MixerAI Section Review Findings
description: Discovery log and remediation instructions for dashboard hardening pass.
last_updated: 2025-10-30
---

# MixerAI Section Review Findings

**Audience**: The engineer implementing fixes. This document is your single source for scope, issues discovered, and the exact steps/tests required.

**How to work from this doc**
- Tackle issues per section chunk (matching `docs/review/section-review-scope.md`).
- For each issue below, follow the remediation instructions and run the specified verification commands.
- Record progress in `docs/section-review-tracker.md` as you complete items.

---

## Dashboard Home (`/dashboard`)

- **Activity feed over-fetches & breaks pagination**  
  - Path: `src/app/dashboard/page.tsx:40-63`  
  - Impact: `getTeamActivity` queries Supabase with `.range(0, limit)`. Supabase ranges are inclusive, so limit `30` returns 31 rows. This inflates the activity list and causes `hasMore` to be false when 31st record exists.  
  - Fix: Update `.range(0, limit)` to `.range(0, limit - 1)` and guard against `limit <= 0`. Add a unit test for the helper or a lightweight integration test that stubs Supabase response length and verifies `hasMore`.  
  - Verify: `npm run lint`, plus add/run a Jest test under `src/__tests__/dashboard.test.ts` (or create a new file) covering the helper logic.

- **Un-typed Supabase client hides schema regressions**  
  - Path: `src/app/dashboard/page.tsx:81-84` (`SupabaseClient<any>`) and repeated TODOs to “uncomment when types are regenerated”.  
  - Impact: We lose compile-time guarantees on content status enums and relationships; recent incidents slipped through because of this.  
  - Fix: Regenerate Supabase types (`npm run db:types`), import `Database` from `@/types/supabase`, and replace `SupabaseClient<any>` with `SupabaseClient<Database>`. Clean up TODO comments here and in dependent helpers (`getTeamActivity`, `getMostAgedContent`). Resolve any resulting TypeScript errors.  
  - Verify: `npm run db:types`, `npm run lint`, `npm run test -- content dashboard` (ensure affected tests compile).

---

## Brands (`/dashboard/brands/*`)

- **PII payloads logged to console during brand creation**  
  - Path: `src/app/dashboard/brands/new/page.tsx:641-642`  
  - Impact: `console.log('Creating brand with payload', payload)` exposes emails, guardrails, and tone data in client logs (visible to end users and collected in telemetry).  
  - Fix: Remove debug logging before shipping. If debugging is still needed, gate behind `process.env.NODE_ENV === 'development'`.  
  - Verify: Manually create a brand in dev and confirm no payload logs appear; run `npm run lint`.

- **Additional website URLs are accepted without validation**  
  - Path: `src/app/dashboard/brands/new/page.tsx:618-639`  
  - Impact: We send raw strings to the API; malformed URLs make it into Supabase and break downstream domain normalization.  
  - Fix: Before appending to `payload.additional_website_urls`, validate each entry with `new URL(value)` inside a try/catch. Reject invalid entries and show a toast explaining which URLs were dropped. Add a frontend unit test (React Testing Library) that asserts invalid URLs trigger the toast and do not hit the API.  
  - Verify: `npm run test -- brand` (add new test suite under `src/__tests__/brands/new-brand.test.tsx`), plus manual smoke test by entering a bad URL.

- **API fallback data still ships during build**  
  - Path: `src/app/api/brands/route.ts:120-146`  
  - Impact: When `isBuildPhase()` mis-detects (seen on Vercel preview), the endpoint serves mock data, hiding real validation errors.  
  - Fix: Remove mock fallback or gate it strictly behind `process.env.NODE_ENV === 'development'`. Update integration tests to expect real data shape (no `isMockData`).  
  - Verify: `npm run lint`; add/update API test under `src/__tests__/api/brands.test.ts`.

---

## Content – List & Detail (`/dashboard/content/*`)

- **Workflow notifications disabled**  
  - Path: `src/app/api/content/[id]/workflow-action/route.ts:240-306`  
  - Impact: Notification RPC (`enqueue_workflow_notification`) is commented out, so reviewers and assignees never receive alerts on reject/approve. This regressed after the last migration delay.  
  - Fix: Land the pending Supabase migration for `enqueue_workflow_notification` and re-enable the RPC loop. Wrap the call in error handling so a failed enqueue doesn’t block the main action. Add logging via existing `handleApiError`.  
  - Verify: 1) `supabase db push` (staging first). 2) Add integration test that stubs Supabase RPC and asserts it executes. 3) Manual flow: approve content and confirm notification record in `notifications` table.

- **Content deletion permissions leak audit info via console**  
  - Path: `src/app/api/content/[id]/route.ts:470-505`  
  - Impact: We `console.log` when admins delete content, including IDs and brand context, which leaks into client logs because API runs in edge runtime.  
  - Fix: Replace console logging with structured logger (or remove). Maintain audit trail via existing Supabase tables instead.  
  - Verify: `npm run lint`. Confirm logs disappear by deleting content locally with logging enabled.

- **Toast storms on session expiry**  
  - Path: `src/hooks/use-common-data.ts:30-54` (`useCurrentUser`)  
  - Impact: When `/api/me` rejects (e.g., session timeout), every component using the hook surfaces a toast. Users get multiple duplicated error banners.  
  - Fix: Move toast responsibility out of the hook. Return the error and let page-level components decide. Provide a memoized flag so we only show one toast per failure. Update consumers (Content list/detail, Workflows, Tools) to handle errors gracefully.  
  - Verify: Unit test for the hook to ensure no side effects; manual test by expiring session and observing single toast.

---

## Workflows (`/dashboard/workflows/*`)

- **Outdated workflow creation RPC contract**  
  - Path: `src/app/api/workflows/route.ts:368-411`  
  - Impact: After calling `create_workflow_and_log_invitations`, we issue a second update to set `description`, `template_id`, and `status`. This is brittle and has already led to races where the second call fails silently, leaving workflows with null metadata.  
  - Fix: Update the Supabase RPC to accept `description`, `template_id`, and `status` parameters. Remove the follow-up `update()` block once the RPC handles the fields atomically. Ensure migration is deployed and types regenerated.  
  - Verify: `supabase db push` (staging then prod), `npm run db:types`, `npm run test -- workflows`. Manual: create workflow and confirm metadata persists.

- **Workflow duplication lacks cache invalidation**  
  - Path: `src/app/dashboard/workflows/page.tsx:137-169`  
  - Impact: After duplicating, we redirect to the edit page but the list view cache isn’t invalidated. Returning to `/dashboard/workflows` shows stale data until refresh.  
  - Fix: After successful duplication, call `queryClient.invalidateQueries` for the workflows list (similar to other pages) before redirecting.  
  - Verify: Manual: duplicate workflow and use browser back—list should show the new copy without reload.

---

## Users & Access (`/dashboard/users/*`)

- **Brand removal impact endpoint returns stubbed data**  
  - Path: `src/app/api/users/[id]/brand-removal-impact/route.ts:28-70`  
  - Impact: Always reports “safe to remove” because the RPC call is commented out. Admins receive wrong guidance and can remove users who still own workflows or content.  
  - Fix: Implement the real RPC (`check_user_workflow_assignments`) or equivalent SQL to compute workflow/content counts. Update the API to surface actual `affected_workflows` and `affected_content`. Add unit tests mocking Supabase responses.  
  - Verify: Write integration test hitting the endpoint with seeded data; manual check by removing a user with assignments (ensure warning surfaces in UI).

- **User list fetch loops until infinity without abort handling**  
  - Path: `src/app/dashboard/users/page.tsx:108-155`  
  - Impact: When the API repeatedly errors, the `while` loop keeps calling `/api/users` because `total` remains `Infinity`. This hammers the endpoint.  
  - Fix: Break the loop when a page fetch fails (after setting error state). Set `total = aggregated.length` right before throwing to avoid infinite loops.  
  - Verify: Unit test mocking a failed second page; ensure loop stops. Manual: throttle `/api/users` to 500s and confirm page stops retrying after first failure.

---

## AI Tools (`/dashboard/tools/*`)

- **Tool history page bypasses API & RLS**  
  - Path: `src/app/dashboard/tools/history/[historyId]/page.tsx:720-784`  
  - Impact: Client-side Supabase query hits `tool_run_history` directly, which requires elevated permissions. Under current RLS rules it fails silently; if RLS loosens, it exposes system-wide history to any user with a link.  
  - Fix: Replace direct Supabase query with `/api/me/tool-run-history/[historyId]` (create endpoint if needed). Use `useToolAccess` / `useToolHistory` to respect permissions. Remove client-side `createSupabaseClient()` usage.  
  - Verify: Add API route + tests. Manual: access history detail as editor and confirm data loads via API, and unauthorized users receive 403.

- **Access guard doesn’t surface actionable error**  
  - Path: `src/app/dashboard/tools/alt-text-generator/page.tsx:70-114` (and other tools)  
  - Impact: When `useToolAccess` fails (network or auth), we only show generic “Unable to verify your session” without retry/back link logic.  
  - Fix: Provide consistent error banner with retry + support contact. Reuse a shared component so each tool doesn’t reimplement.  
  - Verify: Manual toggling of permissions; ensure UI reflects disabled state with guidance.

---

## Claims (`/dashboard/claims/*`)

- **Legacy claims rely on stale vetting/product caches**  
  - Path: `src/app/dashboard/claims/page.tsx:260-354`  
  - Impact: `Promise.all` fetches brands/products/ingredients but never invalidates caches when the user switches brands or edits data elsewhere. Users see outdated dropdowns until reload.  
  - Fix: Move dataset fetching into React Query with brand-search keys; invalidate on relevant mutations (e.g., new ingredient).  
  - Verify: Manual: edit ingredient and confirm list updates without refresh. Add unit test for query invalidation (mock query client).

- **Preview page exposes raw console logs**  
  - Path: `src/app/dashboard/claims/preview/page.tsx:631-641` (`console.log` of payload and response)  
  - Impact: Sensitive claim payloads (including regulatory notes) leak to console; some customers block console logging.  
  - Fix: Remove or gate logs behind dev check.  
  - Verify: Manual: run preview submit; ensure no payload logs.

---

## Cross-Cutting / Tooling

- **Global toast side effect (see Content section)** – apply fix across all consumers once `useCurrentUser` is updated.
- **Tests to run before handoff**  
  1. `npm run lint`  
  2. `npm run test` (ensure new tests pass)  
  3. Targeted flows:  
     - Brand creation + identity generation  
     - Content approve/reject + notification auditing  
     - Workflow create/duplicate  
     - User brand removal impact modal  
     - Tool history detail access (authorized vs unauthorized)  
     - Claims ingredient update → claims list refresh

Document any unexpected findings in `docs/section-review-tracker.md` when you close an issue. Reach out in Slack `#mixerai-app` if the Supabase migrations conflict; we have pending work queued for notifications and workflow RPCs.

