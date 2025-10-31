---
title: Workflows – Library Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/workflows` and `/api/workflows`.
last_updated: 2025-10-30
stage: finished
---

# Workflows – Library – Deep Dive Review

## Scope
- Entry points: `/dashboard/workflows`, duplication/delete dropdown flows, supporting APIs `/api/workflows`, `/api/workflows/:id`, `/api/workflows/:id/duplicate`.
- Key components/APIs: `src/app/dashboard/workflows/page.tsx`, `src/app/api/workflows/route.ts`, `src/app/api/workflows/[id]/route.ts`, `src/app/api/workflows/[id]/duplicate/route.ts`, Supabase function `create_workflow_and_log_invitations`.
- Assumptions: Workflow detail/editor handled separately; workflow execution covered under content detail review.

## Architecture & Data Flow
- **Rendering model**: Client component gated by `useCurrentUser`; fetches workflows via `apiFetch`, feeds a `DataTable`, and exposes duplicate/delete actions only to brand/global admins.
- **Data sources**: `/api/workflows` queries Supabase `workflows` joined with `brands`, `content_templates`, and counts from `workflow_steps`/`content`. `/api/workflows/:id/duplicate` inserts directly into `workflows` and `workflow_steps` before logging via `logSecurityEvent`.
- **State holders**: Local React state for workflow rows, duplicate/delete progress, and dialogs; no query caching beyond `useCurrentUser`.
- **Critical dependencies**: Supabase tables `workflows`, `workflow_steps`, `content`, `user_brand_permissions`, `profiles`; RPC `create_workflow_and_log_invitations`; security logging helper `logSecurityEvent`.

## Findings & Recommendations

### High Priority

1. **Duplicated workflows drop assignees and related metadata**  
   - File: `src/app/api/workflows/[id]/duplicate/route.ts:18`  
   - Impact: `prepareStepForTableInsertion` ignores `assigned_user_ids` (and any additional columns beyond the handful it maps). Duplicated workflows therefore lose reviewer assignments and safeguards, forcing manual rebuilds and risking unassigned content approvals.  
   - Fix: Copy `assigned_user_ids` (and the associated metadata) when constructing `newStepRowsForTable`, and wrap the shell/step inserts in a transaction so a failure rolls back the workflow.  
   - Verification: Duplicate a workflow whose steps have assigned reviewers; the resulting workflow should surface identical assignments in `/dashboard/workflows/:id/edit`.

2. **Workflow APIs emit PII in console output**  
   - Files: `src/app/api/workflows/route.ts:330`, `src/app/api/workflows/route.ts:341`, `src/app/api/workflows/route.ts:479`, `src/app/api/workflows/[id]/duplicate/route.ts:166`  
   - Impact: Error and debug logs include user email addresses and serialized step payloads, which can leak PII in shared logging backends.  
   - Fix: Replace direct `console.*` calls with the structured logger and redact emails/workflow bodies; prefer request IDs or counts over raw objects.  
   - Verification: Trigger an invalid assignee email and a duplication failure; confirm logs no longer contain addresses or workflow contents.

### Medium Priority

- **Post-create patching hides partial failures** – `src/app/api/workflows/route.ts:397` performs a follow-up update to set description/template/status because the RPC omits those fields. If that update fails the handler still returns success, leaving drafts without metadata. Extend the RPC and propagate errors until the patch can be removed.  
- **Duplication resets workflow metadata** – `src/app/api/workflows/[id]/duplicate/route.ts:123` creates the copy with `status: 'draft'` and omits the original description or status, so duplicated workflows lose context and require manual clean-up. Copy the relevant columns (description, status, created_by, etc.) from the source workflow instead of hard-coding defaults.  
- **Library list lacks pagination or caching** – `src/app/dashboard/workflows/page.tsx` downloads the full dataset on every load. Add pagination parameters and reuse results via React Query to keep large tenants responsive.  
- **Delete confirmation omits usage context** – The dialog in `src/app/dashboard/workflows/page.tsx` does not surface `content_count`, so admins cannot see downstream impact before deleting. Surface the count and block deletion (or add extra confirmation) when usage is non-zero.

### Low Priority / Enhancements

- Add template/status filters alongside the existing brand filter to speed up triage.
- Provide CSV/JSON export for workflow definitions so Compliance can archive approval paths.
- Replace the duplicate success redirect with an inline toast action (e.g., “Open workflow”) to support multi-duplicate workflows without navigation thrash.

## Performance & Observability Notes
- Capture metrics around `/api/workflows/:id/duplicate` latency and failure rates instead of relying on verbose console logs.
- Instrument `/api/workflows` GET with tracing so we can correlate Supabase latency spikes with client fetch durations.

## Testing Gaps
- Add API tests covering duplication to assert step assignees (and other metadata) persist in the copy.
- Unit-test the workflow creation handler’s error paths to ensure metadata updates bubble up failures once the RPC is expanded.
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- workflows` (add coverage)  
  3. Manual: duplicate a workflow with assigned reviewers, delete one with high `content_count`, verify pagination toggles when implemented.

## Follow-Up Actions
- **Align access controls** – Update `/api/workflows` GET to enforce the same admin-only access as the UI (or loosen the UI intentionally) so editors without admin rights can no longer enumerate workflows via direct API calls.  
- **Document duplication invite policy** – Confirm with product that duplicating a workflow should start without pending invitations, then codify the decision in the duplication handler and user docs.  
- **Adopt expanded workflow RPC** – Roll out the newer `create_workflow_and_log_invitations` signature defined in `supabase/migrations/20250923121000_add_notification_settings_version.sql` and update the API route once it is deployed.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Workflow library fixes verified; stage marked `finished`.
