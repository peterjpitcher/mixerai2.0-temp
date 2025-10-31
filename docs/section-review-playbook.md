---
title: MixerAI Section Review Playbook
description: End-to-end discovery, remediation, and validation checklist for every authenticated surface in MixerAI 2.0.
last_updated: 2025-10-30
---

# MixerAI Section Review Playbook

Use this playbook whenever you pick up a new area of the MixerAI dashboard. It aligns discovery, hardening, and validation work across features like Brands, Content Workflows, Templates, AI Tools, and Claims so every surface ships with the same reliability, security, and performance guarantees.

Track progress per route group in `docs/section-review-tracker.md` and cross-reference feature ownership in `docs/features.md`.

---

## 1. Scope & Inventory

1. **Identify the route prefix** (e.g. `/dashboard/brands`, `/dashboard/content`, `/dashboard/tools`) plus nested pages (`page.tsx`, dynamic routes, modals under `loading.tsx` or `@modal` segments). Confirm entry points from the global navigation (`src/components/dashboard/sidebar`).
2. **List supporting modules**:
   - API handlers in `src/app/api/<feature>/**` that serve the section.
   - Domain helpers in `src/lib/**` (e.g. `src/lib/content`, `src/lib/auth/brand-access.ts`, `src/lib/azure/openai.ts`).
   - Shared UI and hooks under `src/components/dashboard`, `src/components/ui`, `src/hooks/queries/**`, and `src/contexts`.
   - Background jobs or scripts in `supabase/migrations/**` (RPCs, triggers), scheduled scripts in `scripts/`.
3. **Note cross-cutting dependencies**: brand context (`src/contexts/brand-context.tsx`), notifications, audit logging, rate limiting, and analytics (Supabase audit tables, `src/lib/notifications`).

Outcome: a scoped checklist of files, Supabase tables, RPCs, and background tasks to audit.

---

## 2. Behaviour Baseline

- Capture the current UX for the section’s canonical flows (list, search/filter, create, edit, publish, delete, export/import). For content workflows include assignments and approvals; for tools capture both generation and history/polling flows.
- Record short notes or screen captures for each responsive breakpoint handled by Tailwind layouts.
- Profile with DevTools:
  - Network: identify calls made through `apiFetch`, React Query prefetches, and Supabase client usage (look for duplicate brand or profile fetches).
  - React Profiler: measure renders for client components (often suffixed `-client.tsx`).
  - Bundle impact: run `npm run build` with `ANALYZE=true` when changes affect shared primitives.
- Document business rules: derived roles (`src/lib/auth/derived-roles.ts`), brand access expectations, workflow state transitions, AI tool rate limits, and user notifications.

Deliverable: a concise baseline summary (1–2 paragraphs + metrics) stored alongside your tracker entry.

---

## 3. Data Flow Mapping

| Surface | Data Source | Notes |
|---------|-------------|-------|
| Brands dashboards | `src/app/api/brands/**`, Supabase tables `brands`, `user_brand_permissions` | Server Components load initial brand lists; client hooks manage edits and identity regeneration. |
| Content & workflows | `/api/content`, `/api/workflows`, helpers in `src/lib/content` | Detail pages hydrate via Server Components then rely on React Query mutations for step advances and comments. |
| Templates | `/api/content-templates`, `src/lib/content/templates.ts` | Template edits cascade to content; ensure `delete_template_and_update_content` RPC usage is mapped. |
| AI tools | `/api/tools/*` with Azure OpenAI wrappers | Includes tool run history polling and notification fan-out; check rate limiting boundaries. |
| Users & access | `/api/users/**`, `/api/user/**`, `src/lib/auth` | Cross-links to brands and workflows via `user_tasks` view; watch for cached profile data. |
| Claims (legacy) | `/api/claims/**`, `src/lib/claims-service.ts` | Still depends on workflow helpers and market overrides; map any shared components. |

Steps:
1. Enumerate every query (Supabase tables, views, RPCs, external APIs) invoked by server components, route handlers, and React Query hooks.
2. Diagram the call sequence from UI events → client hooks → API routes → Supabase RPCs. Highlight where `createSupabaseAdminClient` bypasses RLS.
3. Flag duplicate, redundant, or unbounded requests (e.g. parallel brand + content fetches on every navigation).

---

## 4. State & Effect Audit

For each component/hook:
1. Catalogue local state (`useState` / `useReducer`), derived state (`useMemo`), side-effects (`useEffect`), and callbacks (`useCallback`). Prioritise client shells like `content-page-client.tsx`, modal controllers, and table filters.
2. Categorise state as UI, derived data, async lifecycle, brand- or role-gated controls.
3. Spot race conditions with React Query (`invalidateQueries`, `refetchInterval`), Supabase realtime listeners, or pending mutations without cleanup.
4. Verify throttling/debouncing in search boxes and tool inputs—avoid double-debouncing between component-level logic and shared hooks.
5. Ensure heavy props (column definitions, action menus) are memoised or moved into stable modules under `src/components/dashboard`.

Produce a table linking each effect to its purpose, dependency list, and clean-up notes.

---

## 5. Permissions & Security

1. Build a permission matrix per action:
   - Global roles (`user_system_roles`, derived roles in `src/lib/auth/derived-roles.ts`).
   - Brand scopes (`user_brand_permissions`) for brands/content/tools.
   - Workflow responsibilities (`workflow_user_assignments`, `user_tasks`).
2. Confirm route handlers use the correct wrappers (`withAuth`, `withAuthMonitoringAndCSRF`, `withAuthAndMonitoring`) and enforce brand checks via `requireBrandAccess`.
3. Validate client UI respects the same rules (disabled buttons vs. hidden groups, informative Sonner toasts).
4. Check audit logging for CRUD and workflow actions (`src/lib/audit/**`, `log_user_activity` RPC).
5. Review RLS policies, RPCs, and Supabase triggers touched by the section. Ensure new columns/flags are included in policies and generated types (`npm run db:types`).

Document gaps, remediation plan, and affected tables.

---

## 6. Server Actions & Service Logic

- Consolidate validation with existing Zod schemas (`src/lib/validation/**`), and normalise payload handling inside API routes.
- Reuse shared utilities: `apiFetch` for client-side calls, `createSupabaseAdminClient` for privileged queries, Azure OpenAI helpers for AI prompts.
- Batch Supabase operations with `Promise.all` or transactions (`supabase.rpc`) where consistency matters (workflow step updates, tool history writes).
- Harden error paths via `handleApiError` and typed responses; ensure toasts and inline errors map to `code`/`hint` fields.
- Trigger cache invalidation (`revalidatePath`, `router.refresh`, `queryClient.invalidateQueries`) after mutations; update React Query keys defined in `src/hooks/queries`.

Outcome: predictable API contracts, resilient server logic, and reusable helpers.

---

## 7. UI & Layout Enhancements

- Verify layout shells (`src/components/dashboard/layouts`) for grid responsiveness, brand theming, and consistent spacing.
- Reuse ShadCN primitives in `src/components/ui` and table abstractions in `src/components/dashboard/tables` for lists, filters, and bulk actions.
- Ensure detail views separate summary vs. editable content; prefer split panes or step-based forms for workflows.
- Standardise loading (`Skeleton` components), empty, and error states; align copy with Sonner toast messaging.
- Check accessibility: Radix primitives already handle focus management—keep `aria-*`, label associations (`Label` components), and keyboard shortcuts (e.g. command palette).

Capture before/after screenshots when adjusting layouts or interaction density.

---

## 8. Performance Review

- Reduce network chatter by coalescing API calls and leveraging Server Components for first paint data (especially `/dashboard/content` and `/dashboard/workflows`).
- Limit payloads with explicit selects in Supabase queries and lean DTOs from API routes.
- Profile React Query caches to avoid redundant fetches across tabs or modals; tune `staleTime`/`gcTime` where appropriate.
- Memoise expensive editors (Tiptap configurations, large tables) and lazy-load optional modules (command palette, analytics overlays).
- Evaluate pagination and virtualization on large tables (`react-virtualized` boundaries under consideration, see `src/components/dashboard/virtualized-table.tsx` if present).
- Consider caching AI tool prompts/results when behaviour allows, using Redis via `src/lib/rate-limit.ts`.

Record measurable improvements (fetch reduction, render time deltas, bundle diff).

---

## 9. Messaging, Notifications & Polling

- Audit polling intervals (`useQuery` with `refetchInterval`, custom `usePolling` hooks) to ensure they pause on tab blur and respect permissions.
- Provide manual refresh actions when polling is throttled or disabled.
- Keep notification badges (`src/components/dashboard/notifications`) in sync with `/api/notifications/mark-read` flows.
- Confirm Sonner toasts use consistent severity and include remediation hints; avoid duplicate success/error toasts from nested handlers.
- Ensure workflow and tool notifications leverage `src/lib/notifications/create-notification.ts` and log via `tool_run_history` where required.

---

## 10. Testing & Observability

- Add or update unit tests in `src/__tests__` for new helpers, validators, and API handlers (Jest + Testing Library).
- Extend integration/e2e coverage using existing scripts or Playwright suites (see `docs/testing.md` and `scripts/testing`). Critical flows: content approvals, template duplication, AI tool generation, permissions fallbacks.
- Update fixtures/seed data in `supabase/migrations/seed` or dedicated scripts to cover new states.
- Add SQL sanity checks or dashboard runbook entries for recurring data issues (log them in this doc if section-specific).
- Confirm telemetry/logging: ensure `error_reports`, `global_override_audit`, and custom audit tables capture new fields; verify dashboards consume them.

Testing matrix example:
| Scenario | Expected outcome | Test coverage |
|----------|-----------------|---------------|
| Workflow reassignment | User removed from step, notifications updated, audit row created | Jest unit + integration |
| Brand permission downgrade | Hidden controls, API 403, Sonner toast | e2e + unit (auth helpers) |
| AI tool rate limit breach | User-facing limit message, no Azure call | Unit (rate limit helper) + integration |

---

## 11. Data Integrity Checks

Add section-specific SQL to monitor invariants. Examples:

```sql
-- Content items without an assigned workflow step
SELECT c.id, c.title, c.status
FROM content AS c
LEFT JOIN workflow_steps AS ws ON ws.content_id = c.id AND ws.is_current = true
WHERE c.status IN ('in_review', 'awaiting_approval') AND ws.id IS NULL;

-- Brand permissions mismatched with assignments
SELECT uta.user_id, uta.workflow_id, ubp.brand_id
FROM user_tasks AS uta
LEFT JOIN workflows AS wf ON wf.id = uta.workflow_id
LEFT JOIN user_brand_permissions AS ubp ON ubp.user_id = uta.user_id AND ubp.brand_id = wf.brand_id
WHERE wf.brand_id IS NOT NULL AND ubp.id IS NULL;
```

Adapt queries for claims (e.g. orphaned `claim_reviews`), templates (content items referencing deleted templates), or AI tools (runs without stored prompts) as needed.

---

## 12. Deployment & Migration Checklist

1. Apply Supabase migrations: `npm run db:push:dry` → `npm run db:push` in staging before production.
2. Regenerate TypeScript types when schema changes: `npm run db:types`.
3. Backfill data via SQL scripts or `supabase db remote commit` if new columns require defaults.
4. Deploy updated Next.js build (`npm run build && npm run start` locally, merge to main for Vercel). Ensure environment variables for Azure OpenAI and Supabase are present.
5. Run integrity checks post-deploy and monitor background jobs (notifications, workflow automation) for regressions.

---

## 13. Wrap-Up

- [ ] `npm run lint` and targeted `npm run test` / `npm run test:coverage` pass locally.
- [ ] Manual regression of section-critical flows (happy path + permission-denied).
- [ ] Documentation refreshed: tracker entry, relevant docs in `/docs`, API contract notes.
- [ ] Stakeholders notified with summary, testing steps, and rollout considerations.
- [ ] Artefacts archived (profiling exports, UX captures, SQL reports) in the team drive.

---

## 14. Applying the Playbook

1. Check `docs/section-review-tracker.md` for the section’s current status and outstanding actions.
2. Duplicate these steps with section-specific details; link to reference material in `docs/features.md`, `docs/frontend.md`, and `docs/backend.md`.
3. Update the tracker with discovery dates, remediation notes, and unresolved follow-ups.
4. If the section introduces new subsystems (e.g. Azure OpenAI prompt variants, GitHub integrations), document deviations here so future reviewers inherit the context.

Keeping this playbook current ensures MixerAI’s dashboard remains stable even as ownership rotates. Treat it as the single source of truth for expectations when executing a section review.

