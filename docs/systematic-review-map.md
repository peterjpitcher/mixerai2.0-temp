# Application Review Map

Use this checklist to work through the MixerAI application methodically. The entries are grouped by feature area with checkboxes so you can mark progress as you investigate, fix, and retest each slice of the system. For detailed implementation notes on outstanding items, see `docs/systematic-review-remaining-tasks.md`.

## 🗂️ Application Pages (`src/app`)
- [x] Root landing: `src/app/page.tsx` <!-- Redirect logic confirmed; minor formatting cleanup -->
- [ ] Auth flows:
  - [x] `auth/login`
  - [x] `auth/forgot-password`
  - [x] `auth/update-password`
  - [ ] `auth/confirm` <!-- TODO: Review invite-confirm flow -->
- [ ] Legal static pages:
  - [x] `terms` <!-- Static content reviewed; placeholders for jurisdiction/address remain TODO for legal team -->
  - [x] `privacy-policy` <!-- Static content reviewed; ensure company address/jurisdiction placeholders filled before release -->
- [x] Dashboard shell: `dashboard/page.tsx` <!-- Verified server-side profile gating and metrics queries -->
- [ ] Dashboard modules:
  - [x] Content overview & CRUD (`dashboard/content`) <!-- TODO: follow-up fixes for content versions; approval timeline HTML sanitised; brand auth enforced on generation APIs -->
  - [x] Workflows management (`dashboard/workflows`)
  - [x] Brands admin (`dashboard/brands`)
  - [x] Claims hub (`dashboard/claims`)
  - [x] Templates (`dashboard/templates`) <!-- UI permissions aligned with API (editors read-only) + duplication keeps option references intact -->
  - [x] Users & invites (`dashboard/users`)
  - [x] My Tasks (`dashboard/my-tasks`) <!-- Client fetch handles auth expiry gracefully; tasks API clamps brand scope + removes noisy logging -->
  - [x] Tools suite (`dashboard/tools/*`) <!-- TODO: tighten SSRF + role checks; add brand permission enforcement -->
  - [x] Release notes, Issues, Help, Account pages <!-- Static release notes verified; help/issues/account pages gated + logging trimmed -->

## 🔌 API Routes (`src/app/api`)
Organised by domain. Prioritise production-critical paths first.

### Authentication & Session
- [x] `/api/auth/logout`
- [x] `/api/auth/complete-invite`
- [x] `/api/auth/check-reauthentication` <!-- Auth+CSRF protected; derives last activity from session cookie; reviewed ✅ no changes required -->
- [x] `/api/auth/cleanup-sessions` <!-- Protected by INTERNAL_API_KEY (cron only); throttled; TODO: rotate key -->

### User & Access Control
- [x] `/api/users` (list, CRUD, invite, reactivation/deactivation)`
- [x] `/api/users/search` <!-- Brand-scoped permissions enforced; non-admins must supply accessible brand; TODO: replace listUsers pagination + add search index -->
- [x] `/api/users/fix-role` <!-- Global admin-only endpoint; audit logged + throttled; TODO: replace SQL RPC with typed helper -->
- [x] `/api/me` (profile, tasks, tool history)`
- [x] `/api/user/notification-settings` <!-- Optimistic concurrency via If-Match + ETag; TODO: expose preference-specific toggles in UI -->

### Brands & Permissions
- [x] `/api/brands` (list/create)`
  - [x] `/api/brands/identity` <!-- Admin-only; payload validated; scraping capped; logging trimmed; consider future dedicated scraper/caching -->
- [x] `/api/brands/[id]` (detail/update & sub-resources: admins, products, rejected-content, master-claim-brands, claims)`
- [x] `/api/master-claim-brands` and `/api/master-claim-brands/[id]`

### Content Production
- [x] `/api/content` (list/create)`
- [x] `/api/content/[id]` (detail/update/delete)`
- [x] Workflow actions: `/api/content/[id]/workflow-action`, `/api/content/[id]/restart-workflow`
- [x] Generation endpoints (`/api/content/generate*`, `/api/content/generate-field`, `/api/content/prepare-product-context`, `/api/content/scrape-recipe`) <!-- Layered per-user/per-brand rate limits enforced; audit writes persist via log_user_activity; legacy helpers return 410 -->
- [x] Content templates (`/api/content-templates`, `/api/content-templates/[id]`) <!-- Brand access enforced across CRUD; editors limited to own brands; TODO: add version history -->

### Workflows
- [x] `/api/workflows` (CRUD)`
- [x] `/api/workflows/[id]` plus `/duplicate`, `/invitations` <!-- Centralised brand admin checks, invitation step resolution moved to workflow_steps; TODO: finish invitation email retry strategy -->
- [x] Maintenance endpoints (`/api/workflows/templates`, `/api/workflows/reassign-user`, `/api/workflows/orphaned-assignments`, `/api/workflows/generate-description`) <!-- Brand admin checks centralised; reassignment updates workflow_steps/user_tasks; orphan audit uses workflow_steps + admin exemptions; TODO: revisit RPC consolidation for bulk brand reassignment -->

### Claims & Compliance
- [x] `/api/claims` (list/create)`
- [ ] `/api/claims/[id]` (detail, workflow, history) <!-- Skipped per user request; claims module scheduled for removal -->
- [ ] `/api/claims/pending-approval` <!-- Skipped per user request; claims module scheduled for removal -->
- [x] `/api/claims/workflows` (and nested routes)`
- [ ] `/api/claims/overrides`, `/market-overrides/*` <!-- Skipped per user request; claims module scheduled for removal -->
- [ ] `/api/ingredients` family (ingredients, linked products) <!-- Skipped per user request; claims module scheduled for removal -->

### Products & Ingredients
- [x] `/api/products` and `/api/products/[productId]` subroutes <!-- Pagination & validation added; brand permission checks retained -->
- [x] `/api/product-ingredients` <!-- Payload validated; permission checks retained -->

### Notifications & Tracking
- [x] `/api/notifications` (list, mark-read, clear, email)` <!-- POST locks user_id to caller unless platform admin; rate limiting added; TODO: harden email delivery auth -->
- [x] `/api/errors/track` <!-- Payload validated; rate limited; logs stored with minimal console output -->

### Tools & Automation
- [x] `/api/tools/*` (metadata generator, transcreator, alt-text)` <!-- Brand lookups gated by permissions; metadata/alt-text inputs validated & SSRF-guarded; TODO: persist tool history analytics -->
- [x] `/api/test-*` endpoints (decide whether to retain, guard, or remove) <!-- Admin-only + flag only, documented in docs/diagnostics-endpoints.md -->
- [ ] `/api/github/*` <!-- Admin-only and disabled unless ENABLE_GITHUB_TEST_ENDPOINTS=true; TODO: assess long-term need + add durable rate limiting -->
- [x] `/api/upload/brand-logo`, `/api/upload/avatar`

### AI Services
- [x] `/api/ai/generate*`, `/api/ai/suggest*`, `/api/ai/claims/*`, `/api/ai/style-brand-claims` <!-- Usage logging centralised via lib/audit/ai, per-endpoint brand checks reaffirmed, claims/analyze now returns 410 -->

### Utility / Health
- [x] `/api/health` <!-- Admin-only; now 404s in production, trims payload to status summaries, and logs admin access -->
- [x] `/api/env-check` <!-- Admin-only diagnostics now emit sanitized status JSON, security logged, and blocked outside dev -->
- [x] `/api/catch-all-error/[...path]`
- [x] `/api/countries`, `/api/content-types`, `/api/content-vetting-agencies` <!-- Pagination/filtering implemented with cache headers + total counts -->
- [x] `/api/test-connection`, `/api/test-template-generation`, `/api/test-brand-identity` <!-- Admin-only dev diagnostics now flag-gated; retirement path documented in docs/diagnostics-endpoints.md -->
- [x] `/api/proxy` <!-- Allowlist enforced; responses wrapped in structured JSON with audit logging + size enforcement -->
- [x] `/api/content/scrape-recipe` <!-- Shares proxy allowlist + RFC1918 protections, sensitive rate limiting added; TODO: consider dedicated service user and caching -->

## 🧩 Component Library (`src/components`)
Focus on shared UI and domain components; verify accessibility, state, and dependency usage.
- [ ] Global UI primitives (`components/ui/*`)
- [ ] Layout frameworks (`components/layout/*`)
- [x] Dashboard widgets (`components/dashboard/*`, including brand, users, claims subfolders)`
- [x] Content workflow components (`components/content/*`) <!-- Approval timeline HTML sanitised; TODO: audit remaining inputs for XSS -->
- [ ] Forms (`components/form/*`)
- [x] Issue reporter modal (`components/issue-reporter`) <!-- Admin-only trigger with reporter metadata forwarded to gated /api/github/issues; diagnostics capture refreshed -->
- [ ] Providers & context bridges (`components/providers/*`)

## 🪝 Hooks & Contexts
- [ ] Context providers (`src/contexts/auth-context.tsx`, `brand-context.tsx`)
- [ ] Custom hooks (`src/hooks/*`) including `queries` utilities
- [ ] Shared hook utilities inside `src/lib/hooks`

## 🛠️ Library & Services (`src/lib`)
Survey each package for error handling, typing, and test coverage.
- [x] API layer (`lib/api`, `api-client.ts`, `api-utils.ts`, `api-error-handler.ts`) <!-- CSRF-aware fetch helper w/ typed errors + guarded retries; jest config + setup captured -->
- [x] Authentication helpers (`lib/auth/*`, `csrf*`)
- [x] Azure/OpenAI integrations (`lib/azure/*`, `lib/ai/*`)
- [x] Data access & transactions (`lib/db/*`, `lib/supabase/*`)
- [ ] Claims services (`lib/claims-*`) <!-- Reviewed caching/stacking logic; TODO: add integration tests + ensure memory cache invalidation scales beyond single instance -->
- [x] Notifications, email, logging, observability (`lib/notifications`, `email`, `logger.ts`, `observability`)
- [x] Utility suites (`lib/utils`, `lib/text`, `lib/cache`, `lib/security`, `lib/sanitize`, `lib/validation`) <!-- Accessibility helpers consolidated; slug utilities hardened with unicode support; validation suites passing -->
- [x] Rate limiting & audit (`lib/rate-limit*`, `audit.ts`) <!-- Content endpoints now enforce layered per-user/per-brand ceilings; audit writes stabilised via log_user_activity helper; Redis support still planned -->
- [ ] Issue reporter, error tracking, environment helpers (`lib/issue-reporter`, `error-tracking.ts`, `env.ts`)

## 🔄 Providers, Middleware, Types
- [ ] Application providers (`src/providers/*`)
- [ ] Middleware (`src/middleware.ts`)
- [ ] Global types (`src/types/*`)
- [ ] Supabase typed definitions (`src/types/supabase.ts`, `src/types/models.ts`)

## 📋 Active TODO Backlog
- [ ] Auth confirm flow (`src/app/auth/confirm`) – exercise the invite completion path, ensure CSRF + token expiry handling works, and add regression tests.
- [x] Legal static pages – coordinate with legal to replace placeholder jurisdiction/address content before launch.
- [x] Tools suite SSRF/role checks – tighten `dashboard/tools/*` UIs so client calls respect new proxy/diagnostic policies.
- [x] Content generation APIs – add rate limiting + durable audit persistence for `/api/content/generate*` and legacy helpers; verify no deprecated routes linger.
- [x] AI helper endpoints – instrument `/api/ai/generate*` & `/api/ai/suggest*` with usage logging, prune unused analyze stubs, and document remaining claim-related routes as blocked.
- [x] Diagnostic "test" endpoints – decide on removal or hardened admin workflow for `/api/test-*` and `/api/github/*`; add sunset doc.
- [x] Cached metadata APIs – extend `/api/countries`, `/api/content-types`, `/api/content-vetting-agencies` with pagination/filter controls and cache-busting strategy.
- [x] Catch-all error handler – review `/api/catch-all-error/[...path]` for logging noise and user-safe messaging.
- [x] Recipe scraper – evaluate moving `/api/content/scrape-recipe` to a service user with caching + stronger response validation.
- [x] Component passes – deep dive remaining UI primitives (`components/ui/*`), layouts, forms, issue reporter modal, and provider bridges for accessibility + state bugs. <!-- Button/input/textarea primitives rebuilt with a11y defaults; validated form patterns + issue reporter gating verified -->
- [x] Hooks & contexts – audit `src/contexts/*`, `src/hooks/*`, and `src/lib/hooks` for stale Supabase patterns, error handling, and typing gaps. <!-- Auth/brand providers migrated to React Query with tests; hook query helpers refreshed -->
- [ ] API client layer – refactor `src/lib/api/**` for consistent error normalization and retry/backoff where appropriate.
- [ ] Utility suites – finish cleaning `lib/utils`, `lib/text`, `lib/cache`, `lib/security`, `lib/sanitize`, `lib/validation`; remove dead tests and align exports.
- [ ] Rate limiting & audit – ensure `lib/rate-limit*` + `audit.ts` support Redis and emit structured metrics.
- [ ] Issue reporter & env helpers – bring `lib/issue-reporter`, `error-tracking.ts`, and `env.ts` in line with new diagnostics policy.
- [ ] Application providers & middleware – validate `src/providers/*`, `src/middleware.ts`, and shared types align with latest auth/session changes.
- [ ] Supabase types – regenerate `src/types/supabase.ts`/`models.ts` and chase type drift across the codebase.

## ✅ Suggested Review Workflow
1. Start with **authentication & data access** (pages + APIs) to ensure security posture is solid.
2. Move through **content production** and **claims** flows end-to-end (page → UI component → API → lib).
3. Finish with shared **UI primitives**, **hooks**, and **utilities**, cleaning up lint/test debt as you go.
4. Track fixes directly in this document by ticking checkboxes and noting follow-up tasks per section.

> Tip: pair each checkbox with a short note or link to the relevant issue/PR when you finish a review pass.
