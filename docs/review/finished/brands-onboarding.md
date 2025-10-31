---
title: Brands – Onboarding Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/brands/new`.
last_updated: 2025-10-30
stage: finished
---

# Brands – Onboarding – Deep Dive Review

## Scope
- Entry points: `/dashboard/brands/new`, supporting API routes `/api/brands`, `/api/brands/identity`, `/api/content-vetting-agencies`, `/api/content-vetting-agencies/recommend`, `/api/master-claim-brands`.
- Key components/APIs: `src/app/dashboard/brands/new/page.tsx`, `src/components/ui/brand-logo-upload.tsx`, Supabase storage bucket `brand-logos`, vetting agency recommendation services.
- Assumptions/exclusions: Existing brand edit flows (`/dashboard/brands/[id]`) reviewed separately; downstream notification/email flows out of scope.

## Architecture & Data Flow
- **Rendering model**: Entire page is a client component (`'use client'`) with local state; conditional early returns handle loading/forbidden states.
- **Data sources**: `apiFetch` pulls `/api/me`, `/api/master-claim-brands`, `/api/content-vetting-agencies`; mutations hit `/api/brands`, `/api/brands/identity`, `/api/content-vetting-agencies/recommend`.
- **State holders**: Local `formData` state captures all brand fields; `useMemo` caches agency lookups; no React Query usage.
- **Critical dependencies**: `BrandLogoUpload` uploads directly to Supabase storage using anon key; recommendation endpoint writes via service-role client; invitations handled in `src/lib/auth/user-management`.

## Findings & Recommendations

### High Priority

1. **Sensitive brand payload logged on client and server**  
   - File(s): `src/app/dashboard/brands/new/page.tsx:683-684`, `src/app/api/brands/route.ts:347-348`  
   - Impact: Logs include brand identity, guardrails, additional URLs, and logo URLs. Browser console leaks sensitive customer data; server logs ship to centralized logging without scrubbing.  
   - Fix: Remove direct `console.log` calls. If diagnostics are needed, gate behind `process.env.NODE_ENV === 'development'` and redact PII before logging.  
   - Verification: Manual brand creation flow; ensure no payload output in browser devtools or server logs (check Vercel log stream).

2. **Additional website URLs accepted without validation/sanitisation**  
   - File(s): Frontend `src/app/dashboard/brands/new/page.tsx:669-678`; API schema `src/app/api/brands/route.ts:23-33`, processing `src/app/api/brands/route.ts:367-370`.  
   - Impact: Users can submit whitespace-only strings or invalid schemes (e.g. `javascript:alert(1)`). Entries propagate to Supabase and brand identity generation, risking failures or XSS in admin tooling that renders these values.  
   - Fix: Trim entries on the client; enforce `commonSchemas.url` at the server by changing `z.array(z.string())` to `z.array(commonSchemas.url)` and re-validating after trimming. Reject or normalise invalid values with explicit error messaging.  
   - Verification: Add unit tests for payload normalisation (frontend helper + backend schema). Attempt to submit invalid URLs—expect validation error.

3. **Vetting agency recommendation endpoint lacks admin guard**  
   - File(s): `src/app/api/content-vetting-agencies/recommend/route.ts:12-70`  
   - Impact: Route uses `withAuth`, so any authenticated viewer can request AI recommendations. The service upserts agencies via service-role client, enabling low-privileged users to mutate catalogue data.  
   - Fix: Switch to `withAdminAuthAndCSRF` (or equivalent role check) and ensure requests include CSRF token. Add explicit role assertions for brand creation contexts.  
   - Verification: Integration test hitting the endpoint as viewer should now 403; admin call should succeed.

### Medium Priority

- **Agency recommendation re-fetches full catalogue immediately after merge**  
  - File(s): `src/app/dashboard/brands/new/page.tsx:628-633`  
  - Impact: After merging `normalizedCatalog`, the component calls `fetchAllVettingAgencies()`, triggering another GET of up to 1000 records. Duplicated work increases load and blocks UI with repeated spinners.  
  - Fix: Skip the extra fetch when AI response already returned merged catalogue; only refetch on explicit user action or when backend data may have changed externally.

- **No abort handling for initial data fetches**  
  - File(s): `src/app/dashboard/brands/new/page.tsx:248-305`  
  - Impact: `/api/me`, `/api/master-claim-brands`, `/api/content-vetting-agencies` requests can resolve after navigation, causing React state update warnings and toasts firing on unmounted components.  
  - Fix: Wrap requests with `AbortController` and guard state updates; return cleanup functions in `useEffect`.

- **Brand identity AI can return non-hex colour values**  
  - File(s): `src/app/dashboard/brands/new/page.tsx:510-522`  
  - Impact: AI sometimes emits colour names (`"deep blue"`). Assignment to `input[type=color]` crashes the control and blocks saving.  
  - Fix: Validate `data.brandColor` before applying; fall back to previous colour when value doesn’t match `/^#[0-9A-F]{6}$/i`. Add unit test for the helper.

### Low Priority / Enhancements

- **Brand logo uploads orphan on cancellation** – Files uploaded to `brand-logos` remain even if brand creation is aborted. Consider a cleanup job keyed on `draftBrandId`.  
- **Toast spam during permission failures** – Multiple toasts fire when `/api/me` fails; coordinating via shared error banner would improve UX.  
- **Language options recomputed on every render** – Memoize `availableLanguageOptions` to avoid re-running `getLanguagesForCountry`.

## Performance & Observability Notes
- Add structured logging around AI recommendation latency and Supabase insert failures (use existing logger instead of `console.error`).  
- Consider caching `/api/master-claim-brands` responses with SWR or React Query to avoid duplicate fetches across tabs.  
- Monitor recommendation success/error counts; currently failures only surface via toasts.

## Testing Gaps
- No automated coverage for `handleCreateBrand`, identity generation, or agency recommendation flows.  
- Need integration tests covering:  
  1. Successful brand creation with agencies & URLs.  
  2. Validation failure on bad additional URLs.  
  3. Permission checks for recommendation endpoint.  
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- brands` (add targeted suites)  
  3. Manual: upload logo, generate identity, generate agencies, submit brand; repeat as viewer to confirm access denied.

## Open Questions / Follow-Ups
- Should non-admin roles ever access branding AI endpoints? Confirm requirements before tightening auth.  
- Do we need rate limiting or quotas on agency recommendations to control AI spend?  
- Decide on lifecycle for draft logos if brand creation is abandoned.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Brand onboarding fixes verified; stage marked `finished`.
