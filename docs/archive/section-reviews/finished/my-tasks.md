---
title: My Tasks Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/my-tasks` and `/api/me/tasks`.
last_updated: 2025-01-15
stage: finished
---

# My Tasks – Deep Dive Review

## Scope
- Entry points: `/dashboard/my-tasks` (task list for current user).  
- API: `/api/me/tasks` (fetches tasks assigned to user).  
- Components: `MyTasksPage`, `TableSkeleton`, `DueDateIndicator`.

## Architecture & Data Flow
- Client component fetches `/api/me/tasks` with `fetch` and `AbortController`.  
- API uses Supabase admin client to query `content`, `user_tasks`.  
- Tasks grouped per brand, includes workflow info.

## Findings & Recommendations

### High Priority

1. **Tasks API returns empty array on permission errors**  
   - Ensure API returns 403 when user lacks brand permissions; currently returns success with empty data causing silent failures.  
   - Fix: respond with 403 and message; update UI to show permission issue.

2. **API logs with console.error including errors**  
   - Replace with structured logging.

### Medium Priority

- `mapContentStatusToDueDateStatus` should handle `rejected` separately (not `completed`).  
- Add pagination support in UI (API already supports).  
- Display brand filters or search.

### Low Priority / Enhancements

- Provide quick actions (approve/reject) from list.  
- Show total tasks count and grouping.

## Performance & Observability Notes
- Cache results using React Query; avoid full reload on retry.  
- Monitor `/api/me/tasks` latency.

## Testing Gaps
- Need tests for permission errors, pagination metadata, status mapping.  
- Commands: `npm run lint`, `npm run test -- tasks`, manual tasks across roles.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- My Tasks fixes verified; stage marked `finished`.

## Status Update
- ✅ `/api/me/tasks` now returns 403 with structured error payloads when brand access is missing and uses the shared structured logger.
- ✅ `/dashboard/my-tasks` implements pagination, brand filtering, and search with dedicated permission messaging.
- ✅ Added Jest coverage for permission errors, pagination metadata, and status mapping, including explicit handling for `rejected` tasks.
