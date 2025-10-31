---
title: Dashboard Home Deep Dive
description: Detailed discovery notes, risks, and remediation plan for `/dashboard`.
last_updated: 2025-10-30
stage: finished
---

# Dashboard Home – Deep Dive Review

Scope covers the main dashboard landing page (`src/app/dashboard/page.tsx`) and the components/APIs it consumes:
- Server helpers: `getTeamActivity`, `getMostAgedContent`, `getProfileWithAssignedBrands`
- Widgets: `TeamActivityFeed`, `MostAgedContent`, `MyTasks`, `TasksSkeleton`
- Supporting APIs: `/api/me/tasks`, Supabase `content`, `profiles`, `brands`

All findings below should be actioned before we move to the next section in the playbook.

---

## Data & Control Flow Summary
- **Session & profile**: `createSupabaseServerClient()` + `getProfileWithAssignedBrands()` → determines user role and permitted brand IDs. Page then calls `supabase.auth.getUser()` again to fetch the same user.
- **Team activity**: Server function `getTeamActivity()` loads recent rows from `content`, then fetches author profiles. Output is passed to `TeamActivityFeed` for rendering.
- **Stalled content**: `getMostAgedContent()` queries `content` joined with `brands`, filters stale/overdue items, and passes a trimmed list to `MostAgedContent`.
- **My tasks**: Client component `MyTasks` fetches `/api/me/tasks`, maps into UI list with `BrandDisplay`. Uses `TasksSkeleton` locally for loading state.

---

## Findings & Recommendations

### High Priority

1. **Activity links break for non-content targets**  
   - **Location**: `src/components/dashboard/team-activity-feed.tsx:36-54`  
   - **Issue**: `targetLink` builds URLs using `/dashboard/${item.target.type}/${item.target.id}`. For types like `'brand'` or `'user'`, this generates `/dashboard/brand/:id` and `/dashboard/user/:id`, neither of which exists (actual routes are `/dashboard/brands/[id]` and `/dashboard/users/[id]`).  
   - **Impact**: As soon as we start recording `brand_created` or `user_invited` events, the activity feed will link to 404 pages.  
   - **Fix**: Add an explicit map from `ActivityType` to correct route prefixes. Include an integration/unit test ensuring each activity type resolves to a valid path.  
   - **Verification**: Jest test in `src/__tests__/dashboard/team-activity-feed.test.tsx` asserting URL generation, plus manual click-through once events are produced.

2. **Activity labels misrepresent workflow state**  
   - **Location**: `src/app/dashboard/page.tsx:44-118` (`getTeamActivity`)  
   - **Issue**: We collapse all non-`draft` statuses into `'content_updated'`, despite the feed supporting richer types (`content_submitted`, `content_approved`, `content_rejected`).  
   - **Impact**: Reviewers lose signal about approvals vs submissions, undermining the page’s purpose. Business partners already requested visibility into approval actions.  
   - **Fix**: Map `content.status` to the enumerated activity types (pending/approved/rejected/published). Extend tests to cover each mapping. Consider joining workflow/version tables if needed for more context.  
   - **Verification**: Unit test around `getTeamActivity` (mock query result) plus manual flow (create content → submit → approve) to confirm feed messaging.

### Medium Priority

3. **Inclusive Supabase range returns off-by-one records**  
   - **Location**: `src/app/dashboard/page.tsx:37-63`  
   - **Issue**: `.range(0, limit)` is inclusive; default limit 30 yields 31 rows and the banner reads “Showing the latest 31 activities”.  
   - **Impact**: Minor UI inaccuracy and unnecessary extra row on every request.  
   - **Fix**: Change to `.range(0, limit - 1)` after guarding for `limit <= 0`. Update tests for pagination edge cases.  
   - **Verification**: Jest test ensuring `hasMore`/row counts stay consistent, visual check of banner text.

4. **Duplicate session fetches on initial render**  
   - **Location**: `src/app/dashboard/page.tsx:128-155` & `src/lib/auth/user-profile.ts`  
   - **Issue**: `getProfileWithAssignedBrands()` calls `supabase.auth.getUser()`, and the page fetches the user again to read `full_name`.  
   - **Impact**: Two round trips to Supabase on every dashboard hit; unnecessary latency and opportunity for inconsistent data if one request fails.  
   - **Fix**: Fetch the user once, pass it into the helper (or have helper return the user object alongside brands). Add regression test verifying helper behaves when provided user.  
   - **Verification**: Unit test for helper; instrumentation via logging to confirm single auth call.

5. **My Tasks silently swallows API errors**  
   - **Location**: `src/components/dashboard/my-tasks.tsx:11-42`  
   - **Issue**: On fetch failure we log to console and return `[]`, leaving the widget blank with no user feedback.  
   - **Impact**: Operators cannot tell whether they truly have no tasks or the API failed (observed during Supabase brownouts).  
   - **Fix**: Surface an inline error state with retry, and optionally reuse toast infrastructure. Add tests for error rendering.  
   - **Verification**: React Testing Library suite for success/error states; manual test by forcing `/api/me/tasks` to 500.

### Low Priority / Enhancements

6. **Activity feed lacks actionable “View more” link**  
   - Banner text mentions “Visit the activity log” but there is no CTA. Add button linking to the future activity hub once available.  

7. **`getProfileWithAssignedBrands` returns potential `null` brand IDs**  
   - Filter out falsy `brand_id` values before returning (`user_brand_permissions` sometimes holds nulls from legacy data). Helps avoid malformed `.in('brand_id', assignedBrands)` queries.  

8. **`MyTasks` should use `apiFetch`**  
   - Align with existing client fetch wrappers to gain CSRF headers, retry, and typed errors. Add `AbortController` to avoid setting state on unmounted component.

---

## Performance & Observability Notes
- Team activity currently performs two sequential Supabase calls. After the status mapping changes, profile fetch should be wrapped in `Promise.all` or the data returned directly from the content query via joins to avoid an extra round trip.
- Consider caching results per request (`revalidateTag`) once we stabilize the API to reduce Supabase load for concurrent dashboard hits.
- Add structured logging (rather than `console.error`) for failures in `getTeamActivity`/`getMostAgedContent` so observability tools can alert on data regressions.

---

## Testing Gaps
- No automated coverage for `getTeamActivity` or `getMostAgedContent`. Add unit tests that mock Supabase responses to validate filtering and status mapping.
- `TeamActivityFeed` lacks snapshot/behaviour tests. Create component tests ensuring grouping by time period works and links resolve.
- `MyTasks` requires RTL tests for loading, success, empty, and error states.

Suggested scripts after fixes:
1. `npm run lint`
2. `npm run test -- dashboard`
3. Manual flows:
   - Create content → submit → approve (verify feed messaging & notification)
   - Trigger `/api/me/tasks` failure (simulate 500) to see error UI
   - Log in as brand-scoped editor to confirm filtered activity/task lists

---

## Open Questions / Follow-Ups
- Do we have an activity log route ready? If not, capture requirement for `/dashboard/activity` before wiring the CTA.
- Should stalled content include `approved` but unpublished items? Confirm expected behaviour with Content Ops.
- Are we ready to emit non-content activity events (brands/users)? Coordinate with audit/notification team before adjusting feed schema.

---

## Implementation Order (Recommended)
1. Fix activity route mapping & add tests.
2. Implement status-based activity typing and adjust Supabase query.
3. Address off-by-one range + brand ID sanitisation.
4. Refactor session fetch duplication.
5. Improve `MyTasks` error handling and migrate to `apiFetch`.
6. Add “View more” CTA once target route is confirmed.

Update `docs/section-review-tracker.md` with progress per item when complete. Ping @peterpitcher if Supabase RPC changes are required before moving forward.
