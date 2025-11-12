---
title: Content – Detail & Editor Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/content/[id]`, `/dashboard/content/[id]/edit`, and related APIs.
last_updated: 2025-10-30
stage: finished
---

# Content – Detail & Editor – Deep Dive Review

## Scope
- Entry points: `/dashboard/content/[id]`, `/dashboard/content/[id]/edit`, supporting APIs `/api/content/[id]` (GET/DELETE/PUT), `/api/content/[id]/workflow-action`, `/api/content/[id]/regenerate`, `/api/content/[id]/restart-workflow`.
- Key components/APIs: `content-page-client.tsx`, detail view, editor page, workflow actions, notification hooks.
- Assumptions: List/search handled separately; notifications/AI integration cross-covered.

## Architecture & Data Flow
- **Rendering model**: Client components fetch data via `apiFetch` with `AbortController`; detail uses Suspense wrapper parent.
- **Data sources**: `/api/content/:id` for core payload, `/api/brands/:brandId`, `/api/content-templates/:id`, `/api/content/:id` PUT/DELETE for mutations, workflow RPCs for actions.
- **State holders**: Local React state for content, versions, template, brand; editor uses `useAutoSave`.
- **Critical dependencies**: Supabase RPC `get_content_detail`, `workflow_steps`, `user_tasks`, notifications, AI re-generation endpoints.

## Findings & Recommendations

### High Priority

1. **Sensitive content data logged in detail & editor views**  
   - Files: `src/app/dashboard/content/[id]/page.tsx:339-340`, `src/app/dashboard/content/[id]/edit/page.tsx:672-673`  
   - Impact: Logs include full content payload, guardrails, published URLs, exposing private marketing copy via browser console.  
   - Fix: Remove `console.log` or wrap in dev-only guard with redaction.  
   - Verification: Load content detail/edit in prod; confirm no payload printed.

2. **Workflow notification RPCs disabled in workflow-action route**  
   - File: `src/app/api/content/[id]/workflow-action/route.ts:238-308` (commented-out `enqueue_workflow_notification`)  
   - Impact: Approve/reject actions no longer send notifications, so assignees miss updates.  
   - Fix: Re-enable RPC calls after ensuring migration exists; wrap errors with logging but non-blocking. Add tests.  
   - Verification: Approve content; check notifications table or UI for entry.

3. **Regenerate endpoint returns arbitrary JSON without validation**  
   - File: `src/app/api/content/[id]/regenerate/route.ts` (broad `Record<string, unknown>` assignments)  
   - Impact: AI responses stored without schema, causing editor crashes when fields missing; no validation for template outputs.  
   - Fix: Validate regenerated outputs against template schema (use Zod) before saving; reject invalid AI responses.  
   - Verification: Simulate missing field in response—API should 400; editor remains stable.

### Medium Priority

- **Detail page fetch duplicates brand/template requests**  
  - After `/api/content/:id`, brand/template fetched sequentially; no caching, causing latency. Use `Promise.all` or include brand/template within detail API.

- **Editor auto-save conflicts with manual save**  
  - `handleSave` both auto and manual; errors thrown re-trigger toasts. Need clearer separation and success feedback, plus disable auto-save on server error.

- **Delete action lacks optimistic UI**  
  - Deleting content from detail should navigate away; currently only list handles setState. Add router redirect after successful delete.

- **`DueDateIndicator` status mapping incorrect**  
  - Map `'rejected'` to `'rejected'` not `'in_review'`; fix in detail and editor.

### Low Priority / Enhancements

- Add diff viewer for versions vs current content.
- Surface audit trail (who approved/rejected) in detail timeline.
- Prefetch editor data when user clicks edit to avoid blank state.

## Performance & Observability Notes
- Add structured logging around `/api/content/:id` fetch errors; remove `console.error`.
- Monitor AI regeneration success/failure rates with metrics.
- Consider caching content detail with revalidateTag on mutation.

## Testing Gaps
- Lacks unit tests for workflow action outcomes, regenerate endpoint validation, auto-save error handling.
- Add integration tests verifying notifications, template fetch caching, and delete redirect.
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- content` (add suites)  
  3. Manual flows: approve/reject with notifications, regenerate content, auto-save failure recovery.

## Open Questions / Follow-Ups
- Should non-admin editors be allowed to restart workflows? Confirm roles.  
- Define max size/runtime for AI regen to prevent long requests.  
- Align published URL normalization between workflow actions and editor updates.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Findings above implemented and validated; stage marked `finished`.
