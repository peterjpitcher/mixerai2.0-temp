---
title: Workflows – Detail & Editor Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/workflows/[id]`, `/dashboard/workflows/[id]/edit`, and related workflow APIs.
last_updated: 2025-10-30
stage: finished
---

# Workflows – Detail & Editor – Deep Dive Review

## Scope
- Entry points: `/dashboard/workflows/[id]` (redirect) and `/dashboard/workflows/[id]/edit`, supporting APIs `/api/workflows/:id`, `/api/workflows/:id/duplicate`, `/api/workflows/:id` PUT/DELETE, `/api/workflows/:id/users` (search). 
- Key components/APIs: `src/app/dashboard/workflows/[id]/edit/page.tsx`, `src/app/api/workflows/[id]/route.ts`, `src/app/api/workflows/[id]/duplicate/route.ts`, `useAutoSave` integration.
- Assumptions: Workflow library handled separately; notification/logging cross-covered.

## Architecture & Data Flow
- **Rendering model**: Client component with large local state representing workflow definition; uses `useCurrentUser` for permissions and `useAutoSave` to persist changes.
- **Data sources**: `/api/workflows/:id` fetches workflow, steps, assignees; `/api/brands`, `/api/brands/:id/workflows` used for cross-brand duplication warnings; user search hits `/api/users/search`.
- **State holders**: `workflow` object, `brands`, `contentTemplates`, per-step assignee search caches, `useAutoSave` hooking to `handleSave`.
- **Critical dependencies**: Supabase RPCs for step persistence, `workflow_steps`, `workflow_assignees`, brand permissions, `isBrandAdmin`.

## Findings & Recommendations

### High Priority

1. **Workflow payload logged to console during edit**  
   - File: `src/app/dashboard/workflows/[id]/edit/page.tsx:339-340`, `672-673`  
   - Impact: Logs include workflow steps, assignee emails, descriptions—exposed in browser console.  
   - Fix: Remove or dev-gate logging; ensure no sensitive data printed in production.  
   - Verification: Load editor; confirm clean console.

2. **Auto-save uses POST method override with `_method=PUT`**  
   - File: `src/app/dashboard/workflows/[id]/edit/page.tsx:675-678`; API fallback `src/app/api/workflows/[id]/route.ts:424-443`  
   - Impact: Workaround for Cloudflare WAF may be unnecessary now; if kept, needs documentation. Without CSRF guard on POST override, risk of bypass.  
   - Fix: Verify WAF requirement; if obsolete, revert to direct PUT. If required, enforce CSRF token and document usage.  
   - Verification: Call direct PUT in staging; ensure success; remove POST override if safe.

3. **User search lacks debounce cancellation & permission guard**  
   - File: `src/app/dashboard/workflows/[id]/edit/page.tsx` (user search functions)  
   - Impact: Rapid typing spawns concurrent requests; no permission check on response leading to stale results.  
   - Fix: Attach `AbortController` per search, enforce `isBrandAdmin` before populating results.  
   - Verification: Type quickly; network should cancel previous requests; responses filtered.

### Medium Priority

- **Workflow save allows empty steps or no assignees** – Validate before POST/PUT; currently only UI hints.  
- **Cross-brand workflow warning uses synchronous fetch** – Move to React Query or `Promise.all`.  
- **Delete confirmation lacking content usage info** – Should surface `content_count` from API to prevent accidental deletion.

### Low Priority / Enhancements

- Provide step templates or copy-from-existing step functionality.  
- Add change history (audit log) view.  
- Support keyboard shortcuts for step reordering.

## Performance & Observability Notes
- Replace `console.error` with structured logs in API routes (`src/app/api/workflows/[id]/route.ts`).  
- Monitor auto-save frequency; consider throttling or diff-based saves.

## Testing Gaps
- No tests for auto-save success/failure, user search abort, or permission checks.  
- Add integration tests covering workflow update, duplicate, delete flows.  
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- workflows`  
  3. Manual: update steps, search users rapidly, test delete with associated content.

## Open Questions / Follow-Ups
- Confirm Cloudflare WAF workaround necessity; if required, document in runbook.  
- Determine expected roles for generating step descriptions (AI).  
- Define analytics for workflow edits (to measure adoption).

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Workflow detail/editor updates verified; stage marked `finished`.
