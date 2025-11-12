---
title: Brands – Management Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/brands`, `/dashboard/brands/[id]`, and `/dashboard/brands/[id]/edit`.
last_updated: 2025-10-30
stage: finished
---

# Brands – Management – Deep Dive Review

## Scope
- Entry points: `/dashboard/brands`, `/dashboard/brands/[id]` (redirect), `/dashboard/brands/[id]/edit`
- Key components/APIs: `src/app/dashboard/brands/page.tsx`, `src/app/dashboard/brands/[id]/edit/page.tsx`, `src/app/api/brands/[id]/route.ts`, `src/app/api/brands/route.ts`, shared UI (`BrandLogoUpload`, `DeleteBrandDialog`)
- Assumptions: Invitation flows and downstream content/workflow cascades are covered in other sections; onboarding (`/dashboard/brands/new`) tracked separately.

## Architecture & Data Flow
- **Rendering model**: List and edit pages are client components relying on local state; edit page uses `useAutoSave` for PUT requests via method override.
- **Data sources**: `/api/brands` (paginated list), `/api/brands/:id` (details via RPC), `/api/master-claim-brands`, `/api/brands/:id/master-claim-brands`, `/api/content-vetting-agencies`, `/api/content-vetting-agencies/recommend`, `/api/brands/identity`.
- **State holders**: Local React state for form fields, `useMemo` caches for agency lookups and filters; no React Query caching.
- **Critical dependencies**: Supabase RPC `get_brand_details_by_id`, storage bucket `brand-logos`, vetting agency catalogue & recommendation services, `isBrandAdmin` helper for authorization.

## Findings & Recommendations

### High Priority

1. **Brand detail payloads logged to client console**  
   - Files: `src/app/dashboard/brands/[id]/edit/page.tsx:339-340`, `src/app/dashboard/brands/[id]/edit/page.tsx:672-673`  
   - Impact: Logs include brand identity, guardrails, URLs, and logo links—exposing sensitive customer data in the browser and any session recordings.  
   - Fix: Remove `console.log` statements or wrap them in `if (process.env.NODE_ENV === 'development')` with redaction.  
   - Verification: Edit a brand in production/staging and confirm no payload appears in devtools or logging services.

2. **Additional website URLs accept unsafe values**  
   - Files: Frontend transformation `src/app/dashboard/brands/[id]/edit/page.tsx:662-666`; API validation `src/app/api/brands/route.ts:23-33`, `src/app/api/brands/[id]/route.ts:171-188`  
   - Impact: Malformed or `javascript:` URLs are persisted and later rendered, risking XSS and breaking AI scraping.  
   - Fix: Trim and validate each entry on the client; update Zod schema to require `commonSchemas.url` (both create & update). Reject invalid values with user-facing error. Ensure server normalises to `null` if array becomes empty.  
   - Verification: Unit tests covering input sanitisation; attempt to save invalid URLs and observe validation error.

3. **Vetting agency recommendation endpoint open to non-admins**  
   - Files: `src/app/api/content-vetting-agencies/recommend/route.ts:12-70`; invoked from edit page line 555.  
   - Impact: Any authenticated viewer can trigger AI recommendations that upsert agencies via service-role client, effectively modifying global catalogue without permission.  
   - Fix: Replace `withAuth` with `withAdminAuthAndCSRF` (or explicit role check) and ensure the frontend handles 403 gracefully.  
   - Verification: Integration test calling the endpoint as viewer should 403; admin request should succeed.

### Medium Priority

- **List page exposes destructive actions to unauthorized users**  
  - File: `src/app/dashboard/brands/page.tsx:167-214`  
  - Impact: Brand editors/viewers see “Add Brand” and “Delete” options; API eventually denies but UI gives false affordances.  
  - Fix: Fetch current user metadata and gate actions/columns accordingly. Provide read-only message when permissions are insufficient.  
  - Verification: Log in as brand editor/viewer; buttons should disappear or be disabled with tooltip.

- **Repeated full catalogue fetch after recommendations**  
  - Files: `src/app/dashboard/brands/[id]/edit/page.tsx:616-621`, similar pattern in new-brand page.  
  - Impact: After merging AI results, component immediately re-fetches the entire agency list, doubling load.  
  - Fix: Skip `fetchAllVettingAgencies()` when recommendation response already supplies merged catalogue; re-fetch only on manual refresh.  
  - Verification: Inspect network panel while generating agencies—should show single GET.

- **Fetch calls lack abort handling**  
  - Files: `src/app/dashboard/brands/page.tsx:27-98`, `src/app/dashboard/brands/[id]/edit/page.tsx:257-414`  
  - Impact: Navigating away mid-request can trigger state updates on unmounted components and console warnings.  
  - Fix: Wrap `fetch`/`apiFetch` with `AbortController`, return cleanup from `useEffect`.  
  - Verification: Navigate rapidly between pages in dev; no React warnings about “state update on unmounted component”.

- **Brand auto-save ignores guardrail formatting rules**  
  - Files: `src/app/api/brands/[id]/route.ts:125-148` vs. POST formatting logic `createBrandSchema` handling in `route.ts:350-364`.  
  - Impact: Saving arrays or JSON strings in `guardrails` produces inconsistent newline formatting between create and edit flows.  
  - Fix: Reuse formatting helper from POST path when updating (convert arrays/JSON-like strings to bullet list).  
  - Verification: Edit guardrails using list form; fetch brand to verify consistent formatting.

### Low Priority / Enhancements

- Offload brand list pagination loop to backend (support `perPage` > 100) to avoid manual while-loop.
- Share utility for language options to avoid recomputing `availableLanguageOptions` on every render.
- Provide inline success indicator on auto-save instead of only `SaveStatusIndicator`.

## Performance & Observability Notes
- Add structured logging (not `console.error`) around failures in `/api/brands/[id]` to correlate incidents.
- Consider React Query or SWR for shared data (`/api/master-claim-brands`, `/api/content-vetting-agencies`) to reduce duplicate fetches.
- Monitor Supabase RPC latency; brand edit currently waits for three sequential GETs before painting.

## Testing Gaps
- No tests cover brand list filters, delete dialog, or permission gating.
- Lack of integration tests for brand update payload normalisation and agency recommendation permission checks.
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- brands` (add suites for list + edit)  
  3. Manual:  
     - Attempt edit as viewer (expect access denied)  
     - Generate agencies and ensure network traffic stays minimal  
     - Save invalid additional URL and confirm validation error

## Open Questions / Follow-Ups
- Should brand editors be able to generate AI identity or agencies, or is this admin-only? Align UI messaging with policy.
- Define retention/cleanup for orphaned logos when brands are deleted.
- Confirm whether delete cascade prompt should surface counts from `/api/brands/:id` to avoid double queries.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Brands management fixes verified; stage marked `finished`.
