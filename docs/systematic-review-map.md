# Application Review Map

Use this checklist to work through the MixerAI application methodically. The entries are grouped by feature area with checkboxes so you can mark progress as you investigate, fix, and retest each slice of the system.

## 🗂️ Application Pages (`src/app`)
- [ ] Root landing: `src/app/page.tsx`
- [ ] Auth flows:
  - [x] `auth/login`
  - [x] `auth/forgot-password`
  - [x] `auth/update-password`
  - [ ] `auth/confirm` <!-- TODO: Review invite-confirm flow -->
- [ ] Legal static pages:
  - [ ] `terms`
  - [ ] `privacy-policy`
- [ ] Dashboard shell: `dashboard/page.tsx`
- [ ] Dashboard modules:
  - [x] Content overview & CRUD (`dashboard/content`) <!-- TODO: follow-up fixes for content versions; approval timeline HTML sanitised; brand auth enforced on generation APIs -->
  - [x] Workflows management (`dashboard/workflows`)
  - [x] Brands admin (`dashboard/brands`)
  - [x] Claims hub (`dashboard/claims`)
  - [x] Templates (`dashboard/templates`) <!-- UI permissions aligned with API (editors read-only) + duplication keeps option references intact -->
  - [x] Users & invites (`dashboard/users`)
  - [x] My Tasks (`dashboard/my-tasks`) <!-- Client fetch handles auth expiry gracefully; tasks API clamps brand scope + removes noisy logging -->
  - [x] Tools suite (`dashboard/tools/*`) <!-- TODO: tighten SSRF + role checks; add brand permission enforcement -->
  - [ ] Release notes, Issues, Help, Account pages

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
- [ ] `/api/brands/identity` <!-- Admin-only; URL fetches restricted to allowlist + RFC1918 block; TODO: consider dedicated scraping service and caching -->
- [x] `/api/brands/[id]` (detail/update & sub-resources: admins, products, rejected-content, master-claim-brands, claims)`
- [x] `/api/master-claim-brands` and `/api/master-claim-brands/[id]`

### Content Production
- [x] `/api/content` (list/create)`
- [x] `/api/content/[id]` (detail/update/delete)`
- [x] Workflow actions: `/api/content/[id]/workflow-action`, `/api/content/[id]/restart-workflow`
- [ ] Generation endpoints (`/api/content/generate*`, `/api/content/generate-field`, `/api/content/prepare-product-context`, `/api/content/scrape-recipe`) <!-- Template ownership verified & debug logging removed; template payload now reconstructed server-side; product context requests validated; TODO: persist audit logs + review legacy generators -->
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
- [ ] `/api/products` and `/api/products/[productId]` subroutes
- [ ] `/api/product-ingredients`

### Notifications & Tracking
- [x] `/api/notifications` (list, mark-read, clear, email)` <!-- POST locks user_id to caller unless platform admin; rate limiting added; TODO: harden email delivery auth -->
- [ ] `/api/errors/track` <!-- Input validation + rate limiting added; TODO: integrate structured error storage -->

### Tools & Automation
- [x] `/api/tools/*` (metadata generator, transcreator, alt-text)` <!-- Brand lookups gated by permissions; metadata/alt-text inputs validated & SSRF-guarded; TODO: persist tool history analytics -->
- [ ] `/api/test-*` endpoints (decide whether to retain, guard, or remove) <!-- Admin-only and disabled unless ENABLE_TEST_ENDPOINTS=true; TODO: document sunset path -->
- [ ] `/api/github/*` <!-- Admin-only and disabled unless ENABLE_GITHUB_TEST_ENDPOINTS=true; TODO: assess long-term need + add durable rate limiting -->
- [x] `/api/upload/brand-logo`, `/api/upload/avatar`

### AI Services
- [ ] `/api/ai/generate*`, `/api/ai/suggest*`, `/api/ai/claims/*`, `/api/ai/style-brand-claims` <!-- Legacy /ai/generate route disabled (410); suggest endpoint trims sensitive logging and keeps brand checks; TODO: add usage logging + consider removing analyze stub entirely -->

### Utility / Health
- [ ] `/api/health` <!-- Admin-only and behind ENABLE_HEALTH_DIAGNOSTICS, but still returns env/config metadata; TODO: trim sensitive fields and avoid production enablement entirely -->
- [ ] `/api/env-check` <!-- Admin-only + diagnostics flag; TODO: strip Supabase/Azure secrets from payload or retire endpoint post-review -->
- [ ] `/api/catch-all-error/[...path]`
- [ ] `/api/countries`, `/api/content-types`, `/api/content-vetting-agencies` <!-- Cached responses; TODO: add pagination/filtering controls -->
- [ ] `/api/test-connection`, `/api/test-template-generation`, `/api/test-brand-identity` <!-- Admin-only dev diagnostics; TODO: confirm deprecation/removal plan -->
- [ ] `/api/proxy` <!-- Allowlist + RFC1918 blocks; TODO: return structured JSON (no raw upstream body) and tighten logging/audit -->
- [ ] `/api/content/scrape-recipe` <!-- Shares proxy allowlist + RFC1918 protections; response size capped; TODO: consider dedicated service user and caching -->

## 🧩 Component Library (`src/components`)
Focus on shared UI and domain components; verify accessibility, state, and dependency usage.
- [ ] Global UI primitives (`components/ui/*`)
- [ ] Layout frameworks (`components/layout/*`)
- [x] Dashboard widgets (`components/dashboard/*`, including brand, users, claims subfolders)`
- [x] Content workflow components (`components/content/*`) <!-- Approval timeline HTML sanitised; TODO: audit remaining inputs for XSS -->
- [ ] Forms (`components/form/*`)
- [ ] Issue reporter modal (`components/issue-reporter`)
- [ ] Providers & context bridges (`components/providers/*`)

## 🪝 Hooks & Contexts
- [ ] Context providers (`src/contexts/auth-context.tsx`, `brand-context.tsx`)
- [ ] Custom hooks (`src/hooks/*`) including `queries` utilities
- [ ] Shared hook utilities inside `src/lib/hooks`

## 🛠️ Library & Services (`src/lib`)
Survey each package for error handling, typing, and test coverage.
- [ ] API layer (`lib/api`, `api-client.ts`, `api-utils.ts`, `api-error-handler.ts`)
- [x] Authentication helpers (`lib/auth/*`, `csrf*`)
- [x] Azure/OpenAI integrations (`lib/azure/*`, `lib/ai/*`)
- [x] Data access & transactions (`lib/db/*`, `lib/supabase/*`)
- [ ] Claims services (`lib/claims-*`) <!-- Reviewed caching/stacking logic; TODO: add integration tests + ensure memory cache invalidation scales beyond single instance -->
- [x] Notifications, email, logging, observability (`lib/notifications`, `email`, `logger.ts`, `observability`)
- [ ] Utility suites (`lib/utils`, `lib/text`, `lib/cache`, `lib/security`, `lib/sanitize`, `lib/validation`)
- [ ] Rate limiting & audit (`lib/rate-limit*`, `audit.ts`)
- [ ] Issue reporter, error tracking, environment helpers (`lib/issue-reporter`, `error-tracking.ts`, `env.ts`)

## 🔄 Providers, Middleware, Types
- [ ] Application providers (`src/providers/*`)
- [ ] Middleware (`src/middleware.ts`)
- [ ] Global types (`src/types/*`)
- [ ] Supabase typed definitions (`src/types/supabase.ts`, `src/types/models.ts`)

## ✅ Suggested Review Workflow
1. Start with **authentication & data access** (pages + APIs) to ensure security posture is solid.
2. Move through **content production** and **claims** flows end-to-end (page → UI component → API → lib).
3. Finish with shared **UI primitives**, **hooks**, and **utilities**, cleaning up lint/test debt as you go.
4. Track fixes directly in this document by ticking checkboxes and noting follow-up tasks per section.

> Tip: pair each checkbox with a short note or link to the relevant issue/PR when you finish a review pass.
