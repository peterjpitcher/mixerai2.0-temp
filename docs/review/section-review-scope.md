---
title: MixerAI Dashboard Review Scope
description: Route group inventory and review boundaries for upcoming hardening pass.
last_updated: 2025-10-30
---

# MixerAI Dashboard Review Scope

We will audit every authenticated surface in the dashboard, organised into reviewable chunks. Each chunk should be taken through the Section Review Playbook (`docs/section-review-playbook.md`). Use this scope as the single source for discovery work and to avoid gaps or double coverage.

## Summary Table

| Review Chunk | Routes Included | Notes |
|--------------|-----------------|-------|
| Dashboard Home | `/dashboard` | Landing metrics, announcements, quick links. |
| Account | `/dashboard/account` | Profile updates, password change entry points. |
| Brands – Onboarding | `/dashboard/brands/new` | Create flow, validation, asset uploads. |
| Brands – Management | `/dashboard/brands`, `/dashboard/brands/[id]`, `/dashboard/brands/[id]/edit` | List, detail, identity regeneration, team access. |
| Content – List/Search | `/dashboard/content`, `/dashboard/content/new` | Filters, bulk actions, quick create, list performance. |
| Content – Detail/Edit | `/dashboard/content/[id]`, `/dashboard/content/[id]/edit` | Workflow state, Tiptap editor, assignments, history. |
| Workflows – Library | `/dashboard/workflows`, `/dashboard/workflows/new` | Template creation, ordering, duplication. |
| Workflows – Detail | `/dashboard/workflows/[id]`, `/dashboard/workflows/[id]/edit` | Step editing, assignment management, notifications. |
| Templates | `/dashboard/templates`, `/dashboard/templates/new`, `/dashboard/templates/[id]` | Template CRUD, content linkage, preview. |
| AI Tools – Shared Shell | `/dashboard/tools` | Entry cards, usage limits overview. |
| AI Tools – Alt Text | `/dashboard/tools/alt-text-generator` | Prompting, rate limits, outputs, history links. |
| AI Tools – Metadata | `/dashboard/tools/metadata-generator` | SEO metadata generation, brand defaults. |
| AI Tools – Transcreator | `/dashboard/tools/content-transcreator` | Long-form content rewriting, workflow exports. |
| AI Tools – Vetting Agencies | `/dashboard/tools/vetting-agencies` | Agency lookup, filtering, integration points. |
| AI Tools – History | `/dashboard/tools/history/[historyId]` | Run audit trail, permission gating, download/export. |
| Claims – Authoring & Approval | `/dashboard/claims`, `/dashboard/claims/new`, `/dashboard/claims/[id]`, `/dashboard/claims/pending-approval`, `/dashboard/claims/preview`, `/dashboard/claims/brand-review` | Legacy claims workflow, approval loops. |
| Claims – Overrides & Workflow Admin | `/dashboard/claims/overrides`, `/dashboard/claims/workflows`, `/dashboard/claims/workflows/new`, `/dashboard/claims/workflows/[id]`, `/dashboard/claims/workflows/[id]/edit` | Market overrides, workflow configuration. |
| Claims – Taxonomy Management | `/dashboard/claims/brands`, `/dashboard/claims/brands/new`, `/dashboard/claims/brands/[id]`, `/dashboard/claims/brands/[id]/edit`, `/dashboard/claims/ingredients`, `/dashboard/claims/ingredients/new`, `/dashboard/claims/ingredients/[id]/edit`, `/dashboard/claims/products`, `/dashboard/claims/products/new`, `/dashboard/claims/products/[id]/edit` | Metadata maintenance, relational integrity. |
| Users & Access | `/dashboard/users`, `/dashboard/users/invite`, `/dashboard/users/[id]`, `/dashboard/users/[id]/edit` | Invitations, RBAC, profile edit flows. |
| My Tasks | `/dashboard/my-tasks` | React Query task feed, filters, notifications. |
| Issues | `/dashboard/issues` | Issue reporting, screenshot uploads, status transitions. |
| Help | `/dashboard/help` | Knowledge base links, support contact. |
| Release Notes | `/dashboard/release-notes` | Changelog presentation, markdown render. |

## Out-of-Scope but Noted

- Authentication (`/auth/login`, `/auth/forgot-password`, `/auth/update-password`) will be reviewed separately under the Auth team; include any findings if they surface during dashboard testing.
- Marketing/legal pages (`/`, `/privacy-policy`, `/terms`) are static and outside the authenticated review pass unless navigation regressions are discovered.

## Next Steps

1. Log discoveries per chunk in `docs/review/section-review-findings.md` (created during discovery).
2. Reference this scope when assigning work to downstream implementers.
3. Update this file if new routes are added or grouping changes are required; bump `last_updated`.

