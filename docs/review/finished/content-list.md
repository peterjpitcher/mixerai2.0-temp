---
title: Content – List & Filters Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/content` and `/api/content`.
last_updated: 2025-10-30
stage: finished
---

# Content – List & Filters – Deep Dive Review

## Scope
- Entry points: `/dashboard/content`, supporting API `/api/content`, helper hooks `useCurrentUser`, components used within list UI.
- Key components/APIs: `src/app/dashboard/content/content-page-client.tsx`, `src/app/api/content/route.ts`, delete flow hitting `/api/content/[id]`.
- Assumptions: Content detail/editor handled in separate review; workflow actions covered elsewhere.

## Architecture & Data Flow
- **Rendering model**: Client component with local state, Suspense fallback in server wrapper.
- **Data sources**: `/api/content` (lists & filters), `/api/brands/:id` for header context, `/api/content/[id]` for delete.
- **State holders**: Local React state for content array, filters, delete dialog; `useDebounce` for search; `useCurrentUser` for permissions.
- **Critical dependencies**: Supabase admin client in API route, `user_brand_permissions`, `workflow_steps`, `profiles`, `content_templates`.

## Findings & Recommendations

### High Priority (Resolved 2025-10-30)

1. ✅ **Console logging of permission checks in `/api/content`**  
   - Status: Removed user-specific `console.log` statements so permission checks no longer leak IDs or roles (`src/app/api/content/route.ts:54`).  
   - Verification: `npm run lint -- --file src/app/api/content/route.ts`; manual GET as admin/editor confirms logs stay clean.

2. ✅ **Unauthorized brand filters now return 403**  
   - Status: `/api/content` responds with `{ status: 403, success: false }` when brandId is outside the caller’s allowed set, matching privacy expectations (`src/app/api/content/route.ts:84-88`).  
   - Verification: `npm run lint -- --file src/app/api/content/route.ts`; manual request as brand editor against another brand should yield structured 403 error.

3. ✅ **Delete dropdown hidden for non-deleters**  
   - Status: Content list only renders the action dropdown when `canDeleteContent` passes, while reviewers continue to see a dedicated Edit button (`src/app/dashboard/content/content-page-client.tsx:665`, `src/app/dashboard/content/content-page-client.tsx:678`).  
   - Verification: `npm run lint -- --file src/app/dashboard/content/content-page-client.tsx`; manual check as reviewer ensures Delete option never appears and edit flow still works.

### Medium Priority

- **Fetch loops without pagination or caching** _(Resolved 2025-10-30)_  
  - List view now requests `/api/content` with explicit page/limit parameters, renders pagination controls, and surfaces total counts from the API response so operators can step through result pages without reloading the entire dataset.
- **Repeated brand fetch per list reload** _(Resolved 2025-10-30)_  
  - Added a simple in-memory cache for brand header data so selecting a brand reuses the previously fetched payload instead of re-hitting `/api/brands/:id` on each render.
- **Toast storms on permission errors** _(Resolved 2025-10-30)_  
  - `ContentPageClient` now renders a dedicated permission state without firing a second toast on 403 responses, reducing duplicate notifications while retaining generic error toasts for other failures.

### Low Priority / Enhancements

- Provide bulk actions (select multi) future scope; note for follow-up.
- **Brand group skeletons** _(Resolved 2025-10-30)_  
  - Introduced lightweight skeleton rows when filters paginate to preserve table height and avoid layout shifts while data refetches (`src/app/dashboard/content/content-page-client.tsx:100`).
- **Due date status mapping** _(Resolved 2025-10-30)_  
  - Introduced a helper that maps content statuses (`draft`, `pending_review`, `rejected`, `cancelled`, etc.) onto the `DueDateIndicator` enum so deadlines render with consistent semantics (`src/app/dashboard/content/content-page-client.tsx:75`, `src/app/dashboard/content/content-page-client.tsx:655`).

## Performance & Observability Notes
- Instrument `/api/content` latency and error codes; move away from blanket `console.error`.
- Consider server-side search endpoints returning aggregated counts to reduce client grouping work.

## Testing Gaps
- ✅ Added Jest coverage for pagination transitions, 403 permission handling, and action menu gating on the content list (`src/__tests__/dashboard/content-list-pagination.test.tsx`).
- Still missing integration tests that exercise the `/api/content` brand filter against Supabase (beyond mocks) and end-to-end coverage for delete flows.
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- content-list-pagination`  
  3. Manual: search/filter, brand filter without permission, delete as admin vs assignee.

## Open Questions / Follow-Ups
- Should we support saved filters or share state via URL? Currently status filter not in query string.
- Clarify if `all` status should include `cancelled`; API currently accepts but UI never requests.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Content list fixes verified; stage marked `finished`.
