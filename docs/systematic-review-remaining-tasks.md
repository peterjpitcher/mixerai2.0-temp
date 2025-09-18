# MixerAI Remaining Remediation Guide

This document groups every open item from `docs/systematic-review-map.md` into actionable chunks a junior developer can pick up. Each task includes context, target files, recommended implementation steps, and validation notes so work can proceed without constantly cross-referencing the review map.

---

## 🚀 Proposed 4-Sprint Execution Plan

### Sprint 1 – Security & Access Control (Highest Priority)
- [x] Harden content generation APIs (`/api/content/generate*`, `/api/content/prepare-product-context`, `/api/content/scrape-recipe`) with per-user/per-brand rate limits, durable auditing via `log_user_activity`, and stricter brand gating.
- [x] Instrument AI helper endpoints (`/api/ai/generate*`, `/api/ai/suggest*`, `/api/ai/generate-title`, `/api/ai/style-brand-claims`) with shared usage logging and retire the legacy `claims/analyze` stub (now returns 410).
- [x] Update dashboard tools UI to honour tightened diagnostics/proxy rules by hiding admin-only cards from non-admin roles and reflecting allowlisted proxy responses.
- [x] Decide and act on diagnostic/test endpoints (`/api/test-*`, `/api/github/*`)—they remain admin+flag only, and the behaviour is documented in `docs/diagnostics-endpoints.md` for retirement planning.
- [x] Verify auth invite confirmation flow with actionable error messaging, logger instrumentation, and React Testing Library coverage for success and expired token paths.

### Sprint 2 – Core API & UX Hardening
- [x] Extend cached metadata APIs (`/api/countries`, `/api/content-types`, `/api/content-vetting-agencies`) with pagination/filtering and cache controls.
- [x] Review `/api/catch-all-error/[...path]` for safe logging/responses.
- [x] Finalize legal static pages with production-ready content.
- [x] Tighten `/api/content/scrape-recipe` response sanitisation and role checks (if retained).
- [x] Refresh Issue Reporter modal to comply with new notification/auth rules.

### Sprint 3 – Component, Hook, and Utility Cleanup

#### 3.1 UI Primitives & Layout Foundations
- Inventory `src/components/ui/*`, `components/layout/*`, and `components/form/*` for accessibility, focus states, and design-system parity.
- Normalize ARIA usage, keyboard support, and responsive variants; add stories/tests for critical primitives (Button, Input, Dialog, Tabs, Accordion, etc.).
- Deliverable: refreshed primitives/layouts with accompanying Storybook/RTL smoke coverage.
- **Status:** Completed – Button/Input/Textarea primitives now ship with WCAG-compliant defaults and RTL coverage; form layout utilities expose consistent spacing, and dashboards consume the new patterns.

#### 3.2 Form & Content Composition
- Audit brand/content forms (brand create/edit, content editor flows) to ensure React Hook Form integration handles loading/submit/error states correctly.
- Replace legacy text areas with `ValidatedTextarea` where appropriate and add regression tests for form submission behaviour.
- **Status:** Completed – Content/brand forms reuse the `ValidatedTextarea` helper, brand product selector leverages the shared query hook, and regression tests cover validation edge cases.

#### 3.3 Hooks & Context Stabilization
- Review `src/contexts/*`, `src/hooks/*`, `src/lib/hooks` to confirm Supabase session signals, memoization, and error boundaries are consistent.
- Convert lingering SWR usages to React Query (if still present) and add hook-level unit tests with mocked fetch/auth events.
- **Status:** Completed – Supabase auth/brand providers now exercise React Query invalidation paths in tests, `ProductSelect` uses the shared `useBrandProducts` React Query hook (retiring SWR), and new unit suites cover auth-state events plus brand product lookups.

#### 3.4 API Client & Utility Harmonization
- Finalize the API client layer (`src/lib/api-client.ts`, `api-utils.ts`, `api-error-handler.ts`) with typed errors and retry semantics applied across callers.
- Continue utility suite cleanup (`lib/utils`, `lib/text`, `lib/cache`, `lib/security`, `lib/sanitize`, `lib/validation`) by deleting unused helpers, tightening types, and aligning tests.
- **Status:** Completed – New `ApiClientError`/`apiFetchJson` helpers provide structured failures and shared retry controls, core hooks/contexts use the unified client, and API utility fetchers no longer depend on ad hoc axios wrappers.

### Sprint 4 – Infrastructure & Type Hygiene
- Enhance rate limiting & audit infrastructure (`lib/rate-limit*`, `audit.ts`) with Redis support and structured metrics.
- **Status:** Completed – Rate limiting now falls back to shared Redis via Upstash REST when configured, emits metrics on violations/blocks, and audit loggers produce structured metric events alongside Supabase RPC persistence.
- Bring `lib/issue-reporter`, `error-tracking.ts`, and `env.ts` into alignment with diagnostics policy.
- Review application providers and middleware (`src/providers/*`, `src/middleware.ts`) post-auth changes.
- Regenerate Supabase types (`src/types/supabase.ts`, `src/types/models.ts`) and resolve type drift across the codebase.
- Close out optional claims service tasks or document deprecation plan if still pending removal.

---

## 1. Application Pages & Dashboard Shell

### 1.1 Auth Invite Confirmation Flow
- **Location:** `src/app/auth/confirm/page.tsx` + related API interactions (`/api/auth/complete-invite`).
- **Problem:** Flow has not been re-tested since the authentication fixes; risk of stale CSRF/session handling and expired token paths.
- **Implementation Steps:**
  1. Open the page and trace client-side logic for reading the invite token and submitting to the API; ensure CSRF token and Supabase session states are respected.
  2. Harden error handling: show actionable messaging for expired/invalid tokens and log unexpected failures with `logger.ts`.
  3. Confirm success redirects still update user metadata (roles/brands).
- **Validation:** Add a React Testing Library test covering success and expired token states. Manually run through the invite email link in dev to confirm full flow.

### 1.2 Legal Static Pages Finalisation
- **Location:** `src/app/terms/page.tsx`, `src/app/privacy-policy/page.tsx`.
- **Problem:** Pages still contain placeholders for jurisdiction and company address.
- **Implementation Steps:**
  1. Replace placeholders with finalized legal content (from stakeholders).
  2. Ensure typography components match design system and headings remain accessible (`<h1>` → `<h2>` hierarchy).
- **Validation:** Manual review only; no automated tests expected.

### 1.3 Dashboard Tools Section Security Drift
- **Location:** `src/app/dashboard/tools/*` components + API calls to `/api/proxy`, `/api/env-check`, `/api/test-*`.
- **Problem:** UI still assumes the older proxy behaviour; needs to enforce the new allowlist + structured response pattern and hide diagnostics buttons from non-admins.
- **Implementation Steps:**
  1. Audit each tool card for fetch calls; update to handle `{ success, proxied }` envelope and display actionable errors.
  2. Guard admin-only cards behind `useSession()` role checks (match server policy).
  3. Add toast/logging when blocked responses occur to help support teams.
- **Validation:** Cypress/e2e smoke of tool pages; manual check that non-admin accounts can’t trigger restricted tools.

---

## 2. API Surface

### 2.1 Content Generation Endpoints Hardening
- **Location:**
  - `src/app/api/content/generate/route.ts`
  - `src/app/api/content/generate-field/route.ts`
  - `src/app/api/content/prepare-product-context/route.ts`
  - `src/app/api/content/scrape-recipe/route.ts`
- **Problem:** Need rate limiting, durable audit storage, and a final check that every path enforces brand access before touching Supabase/Azure.
- **Implementation Steps:**
  1. Integrate `lib/rate-limit` helpers (or add them if missing) with per-user + per-brand ceilings; respond with 429 on exceed.
  2. Replace `logContentGenerationAudit` stubs with an implementation that writes to the audit table (confirm schema) and fails closed on DB errors.
  3. For `prepare-product-context`, ensure non-admins cannot access unlinked products; sanitize error payloads.
  4. For `scrape-recipe`, re-use the new proxy allowlist logic or route through a dedicated service user, and clamp output to expected recipe schema.
- **Validation:** Jest unit coverage for rate-limit decisions; integration smoke that generation still works with brand-scoped user. Manual test rate-limit by hitting endpoint > limit.

### 2.2 AI Helper Endpoints Usage Logging
- **Location:** `src/app/api/ai/generate*`, `src/app/api/ai/suggest`, `src/app/api/ai/generate-title`, `src/app/api/ai/style-brand-claims` (claims-specific routes remain but shouldn’t be expanded).
- **Problem:** Requests are authenticated but do not emit usage metrics/audit trails; some stubs still reference deprecated flows.
- **Implementation Steps:**
  1. Introduce a shared helper in `lib/audit/ai.ts` that captures user ID, brand ID, input size, and completion metadata.
  2. Wrap each endpoint call, ensuring brand access check runs before logging.
  3. Remove dead endpoints (e.g. analyze stub) or return 410 with clear messaging.
- **Validation:** Unit tests for the new audit helper; manual call to ensure logs flush as expected.

### 2.3 Diagnostic & Test Endpoints Retirement Plan
- **Location:** `/api/test-*` directory, `/api/github/*`, `/api/env-check`, `/api/health` (already hardened server-side), plus dashboard UI.
- **Problem:** We need a firm decision: either delete or document safe usage behind admin flags.
- **Implementation Steps:**
  1. Draft a migration note (README or docs) summarising which endpoints can be removed in production builds.
  2. If keeping, ensure every endpoint shares the new admin+flag guards and returns sanitized payloads (no secrets).
  3. Update the dashboard to hide buttons when disabled.
- **Validation:** Manual. Confirm feature flag off hides routes (404).

### 2.4 Cached Metadata APIs Enhancements
- **Location:** `/api/countries`, `/api/content-types`, `/api/content-vetting-agencies`.
- **Problem:** Currently single-shot responses; need pagination/filtering and cache-busting control.
- **Implementation Steps:**
  1. Add query params (`page`, `perPage`, `search`) and validate via Zod.
  2. Implement simple caching (e.g. `cache-control` headers) and a query to bust via `updated_at` or `ETag`.
- **Validation:** Unit tests for param validation and pagination boundaries.

### 2.5 Catch-All Error Handler Review
- **Location:** `src/app/api/catch-all-error/[...path]/route.ts`.
- **Problem:** Needs a quick audit to ensure no sensitive info leaks and logging uses structured logger.
- **Implementation Steps:** Inspect handler, strip stack traces from response, ensure `logger.error` includes request ID.
- **Validation:** Unit test verifying sanitized response.

### 2.6 Recipe Scraper Follow-Up
- **Location:** `src/app/api/content/scrape-recipe/route.ts`.
- **Problem:** Shares proxy logic but still wide open to large payloads/unstructured results.
- **Implementation Steps:**
  1. Limit returned fields to the recipe interface; drop raw HTML.
  2. Enforce brand/admin role if required (currently only tied to auth).
- **Validation:** Unit test for JSON parsing edge cases; manual smoke with allowlisted URL.

---

## 3. Component Library & UI

### 3.1 Global UI Primitives Audit
- **Location:** `src/components/ui/*`.
- **Problem:** Need accessibility review (focus states, ARIA) and ensure exports match usage; some utilities were re-added but not reverified.
- **Implementation Steps:**
  1. Inventory each primitive (Button, Input, Dialog, etc.) and check for design-system parity.
  2. Add Storybook stories/tests if missing.
- **Validation:** Storybook visual QA + unit tests for keyboard interactions.

### 3.2 Layout Frameworks
- **Location:** `src/components/layout/*`.
- **Problem:** Ensure responsive grids align with new pages; confirm breadcrumb/nav usage.
- **Implementation Steps:** Document layout variants, update where pages rely on deprecated props, add tests for SSR rendering.

### 3.3 Form Components
- **Location:** `src/components/form/*`.
- **Problem:** Validate form field compositions post-auth changes—particularly brand setup forms—and ensure `react-hook-form` integration handles errors gracefully.
- **Implementation Steps:** Add unit tests for submit handlers, confirm loading states, ensure Save buttons disabled when invalid.

### 3.4 Issue Reporter Modal & Provider Bridges ✅
- **Updates:** Issue reporter entrypoint now only renders for admins via `NEXT_PUBLIC_ENABLE_ISSUE_REPORTER`, submits reporter metadata to `/api/github/issues`, and honours shared auth context memoisation.
- **Validation:** Manual modal submission confirmed; API tests updated to reflect structured logging.

---

## 4. Hooks & Contexts

- **Location:** `src/contexts/auth-context.tsx`, `src/contexts/brand-context.tsx`, `src/hooks/*`, `src/lib/hooks/*`.
- **Tasks:**
  1. Ensure contexts listen to Supabase session events introduced in earlier fixes.
  2. Convert legacy SWR hooks to React Query (if planned) and enforce type safety.
  3. Add error boundaries for hooks that call privileged APIs.
- **Validation:** Unit tests for hooks (mock fetch) and integration check in dashboard pages.

---

## 5. Library & Services

### 5.1 API Client Layer
- **Location:** `src/lib/api`, `api-client.ts`, `api-utils.ts`, `api-error-handler.ts`.
- **Problem:** Needs single error normalization path and retry/backoff strategy where safe.
- **Implementation Steps:**
  1. Introduce typed error objects with `code/status/message`.
  2. Update callers to use the helper instead of `fetch` spread across the app.
- **Validation:** Unit tests covering error conversion and retry logic.

### 5.2 Utility Suites Cleanup
- **Location:** `src/lib/utils`, `src/lib/text`, `src/lib/cache`, `src/lib/security`, `src/lib/sanitize`, `src/lib/validation`.
- **Problem:** Some helpers were resurrected for tests but suites remain inconsistent.
- **Implementation Steps:**
  1. Delete unused helpers; ensure each module exports a clear API surface.
  2. Align test harnesses (e.g. rate-limit tests) with current utilities.
- **Validation:** Jest suites for utilities; run `npm test` to confirm.

### 5.3 Rate Limiting & Audit Infrastructure
- **Location:** `src/lib/rate-limit*`, `src/lib/audit.ts`.
- **Problem:** Needs Redis support and structured metrics for new rate limiting tasks.
- **Implementation Steps:** Add Redis client fallback, push metrics to logger, document usage.

### 5.4 Issue Reporter & Env Helpers
- **Location:** `src/lib/issue-reporter`, `src/lib/error-tracking.ts`, `src/lib/env.ts`.
- **Problem:** Must align with tightened diagnostics policy—only allow admin surfaces to view sensitive config.
- **Implementation Steps:** Review exports, ensure they guard secrets, update docs.

### 5.5 Claims Services (Optional – pending deprecation)
- **Location:** `src/lib/claims-*`.
- **Problem:** Even though claims features are being removed, ensure cached services don’t leak memory if left enabled.
- **Implementation Steps:** Add TODO note or skip if module is being deleted soon.

---

## 6. Providers, Middleware, and Types

- **Application Providers:** Verify `src/providers/*` wrap all pages after auth refactors; ensure suspense boundaries are correct.
- **Middleware:** Audit `src/middleware.ts` for redundant redirects and confirm new auth cookies propagate.
- **Global Types & Supabase Definitions:** Regenerate via `supabase gen types`, update `src/types/*`, and fix downstream compile errors.
- **Validation:** TypeScript build + smoke tests on protected routes.

---

## 7. Execution Recommendations

1. **Work From This Document:** Treat each subsection as a Kanban card. Update `docs/systematic-review-map.md` checkboxes as items complete.
2. **Testing Philosophy:** For each API change, add unit coverage plus at least one integration smoke (Postman/Thunder Client). For UI changes, prefer Storybook or RTL tests.
3. **Audit Logging:** Whenever touching protected endpoints, confirm `logSecurityEvent` usage so security analytics stay consistent.
4. **Communication:** Capture follow-up questions or blockers alongside the relevant bullet here to keep the hand-off clear.

---

_Last updated: 2025-09-18_
