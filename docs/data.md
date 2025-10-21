# Data & Supabase

Supabase provides authentication, Postgres storage, row-level security, and the RPC layer. The app never connects to Postgres directly from the browser—privileged operations run on the server with the service-role key.

## Schema Overview

| Area | Tables (Supabase) | Notes |
|------|-------------------|-------|
| Brands | `brands`, `brand_selected_agencies`, `brand_master_claim_brands`, `user_brand_permissions` | Store brand identity, compliance agencies, and per-user permissions. |
| Content | `content`, `content_versions`, `content_templates`, `content_types` | Structured content authored through workflows; versions capture reviewer feedback. |
| Workflows | `workflows`, `workflow_steps`, `workflow_user_assignments`, `workflow_invitations` | Multi-step approval lifecycle and participant tracking. |
| Claims | `claims`, `brand_claims`, `claim_reviews`, `claim_workflow_history`, `market_claim_overrides`, `claim_countries`, `claim_products`, `claim_ingredients` | Legacy claims module still in use for regulated statements. |
| Products & Ingredients | `products`, `product_ingredients`, `ingredients`, `master_claim_brands` | Feed product metadata into content generation. |
| Users & Auth | `profiles`, `user_system_roles`, `user_invitation_status`, `user_tasks`, `notifications`, `tool_run_history` | Extends Supabase auth with profile data, brand RBAC, notifications, and tool usage logs. |
| Observability | `error_reports`, `global_override_audit`, `claim_audit_logs` | Track audits and error reporting. |

Type definitions live in `src/types/supabase.ts` (generated via `npm run db:types`).

## Stored Procedures & RPCs

Common RPCs invoked from the app (`supabase.rpc(...)`):

- `delete_brand_and_dependents` – cascades brand deletion across related tables.  
- `delete_template_and_update_content` – updates content items after template removal.  
- `delete_user_and_reassign_tasks` – cleanup when removing a user.  
- `delete_workflow_and_dependents` – full workflow teardown.  
- `advance_claim_workflow`, `assign_workflow_to_claim` – claim automation helpers.  
- `enqueue_workflow_notification` – background notification queue.  
- `log_user_activity` – audit trail for critical actions.  
- `create_claim_with_associations`, `get_all_claims_for_master_brand` – claims module orchestration.  
- `check_user_workflow_assignments`, `update_user_details` – governance utilities.

Keep RPC definitions in `supabase/migrations/*` so environments stay in sync. When the backend expects a new RPC, add the SQL migration before merging.

## Migrations

- SQL migrations reside in `supabase/migrations`. Run `supabase db push` locally to apply them.  
- Service-role operations should be encapsulated in RPCs to preserve RLS boundaries.  
- After altering tables, regenerate TypeScript types with `npm run db:types`.

## Data Access Patterns

- **Server-side reads**: use `createSupabaseAdminClient()` inside API routes or Server Components where RLS would otherwise block access.  
- **Client-side reads**: prefer calling internal APIs rather than hitting Supabase directly; when necessary, reuse the singleton from `createSupabaseClient()` so session management stays consistent.  
- **Caching**: heavy queries (e.g., `/api/content`) pre-compute related entities to minimise client round-trips. Consider adding Postgres views when joins become unwieldy.

## Environment Variables

Relevant Supabase settings:

- `NEXT_PUBLIC_SUPABASE_URL` – project URL (exposed to the browser).  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon key (browser).  
- `SUPABASE_SERVICE_ROLE_KEY` – server-only service role.  
- `ALLOW_IN_MEMORY_SESSION_FALLBACK` – optional flag used during local dev to bypass strict cookie enforcement.
