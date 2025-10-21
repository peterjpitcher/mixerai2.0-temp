# Feature Guide

Use this reference to jump straight to the code that powers each major dashboard area.

## Brands

- **UI**:  
  - List page – `src/app/dashboard/brands/page.tsx`  
  - Creation flow – `src/app/dashboard/brands/new/page.tsx`  
  - Editor – `src/app/dashboard/brands/[id]/edit/page.tsx`
- **APIs**:  
  - Collection CRUD – `src/app/api/brands/route.ts`  
  - Single brand – `src/app/api/brands/[id]/route.ts`  
  - Identity generator – `src/app/api/brands/identity/route.ts`  
  - Supporting data – `/api/content-vetting-agencies`, `/api/master-claim-brands`, `/api/users/search`
- **Data**: `brands`, `brand_selected_agencies`, `brand_master_claim_brands`, `user_brand_permissions`, RPC `delete_brand_and_dependents`
- **Key helpers**: `src/lib/auth/brand-access.ts`, `src/lib/content/brand.ts`, `src/lib/azure/openai.ts` (for identity regeneration)

## Content & Workflows

- **UI**:  
  - Content list – `src/app/dashboard/content/page.tsx` + `content-page-client.tsx`  
  - Detail view – `src/app/dashboard/content/[id]/page.tsx`  
  - Workflow builder – `src/app/dashboard/workflows/**/*`
- **APIs**:  
  - `/api/content` (list & filters), `/api/content/[id]/**` (detail, versions, workflow actions)  
  - `/api/workflows` + `/api/workflows/[id]/**` (CRUD, duplication, invitations)  
  - `/api/me/tasks` aggregates assignments
- **Data**: `content`, `content_versions`, `workflows`, `workflow_steps`, `workflow_user_assignments`, `user_tasks`  
- **Key helpers**: `src/lib/content/*`, `src/lib/notifications/create-notification.ts`, `src/lib/audit/content.ts`, RPCs `delete_workflow_and_dependents`, `enqueue_workflow_notification`

## Templates

- **UI**: `src/app/dashboard/templates/page.tsx`, `/templates/new/page.tsx`, `/templates/[id]/page.tsx`
- **APIs**: `/api/content-templates`, `/api/content-templates/[id]`, `/api/content-types`
- **Data**: `content_templates`, `content_types`
- **Helpers**: `src/lib/content/templates`, `src/hooks/use-common-data.ts`, RPC `delete_template_and_update_content`

## AI Tools

- **UI**: `src/app/dashboard/tools/*` (alt text, metadata, content transcreation) and history views under `/dashboard/tools/history/[historyId]`
- **APIs**: `/api/tools/alt-text-generator`, `/api/tools/metadata-generator`, `/api/tools/content-transcreator`
- **Data**: `tool_run_history`, `notifications`
- **Helpers**: `src/lib/azure/openai.ts`, `src/lib/ai/*`, `src/lib/auth/brand-access.ts` for permission checks, local rate limiting within each route

## Users & Access

- **UI**: `/dashboard/users`, `/dashboard/account`
- **APIs**: `/api/users`, `/api/users/search`, `/api/users/resend-invite`, `/api/user/profile`, `/api/user/change-password`, `/api/user/notification-settings`
- **Data**: `profiles`, `user_system_roles`, `user_brand_permissions`, `notifications`
- **Helpers**: `src/lib/auth/*`, RPC `delete_user_and_reassign_tasks`, invitation services in `src/lib/auth/invitationService.ts`

## Claims (Legacy but Supported)

- **UI**: `src/app/dashboard/claims/**/*`
- **APIs**: `/api/claims`, `/api/claims/[id]/**`, `/api/market-overrides`, `/api/master-claim-brands`
- **Data**: `claims`, `claim_reviews`, `market_claim_overrides`, `brand_claims`, `claim_workflow_history`
- **Helpers**: `src/lib/claims-service.ts`, `src/lib/claims-utils.ts`, RPCs `create_claim_with_associations`, `advance_claim_workflow`

## Notifications & Logging

- **APIs**: `/api/notifications`, `/api/notifications/mark-read`, `/api/errors/track`
- **Helpers**: `src/lib/notifications/*`, `src/lib/error-tracking.ts`, `src/lib/audit/*`
- **Data**: `notifications`, `error_reports`, `global_override_audit`

## Adding a Feature

1. Stub the API routes under `src/app/api/<feature>` with auth wrappers.  
2. Model data in Supabase (`supabase/migrations` + regenerated types).  
3. Build UI in `src/app/dashboard/<feature>` using shared components and hooks.  
4. Document the addition here so other developers know where to find the implementation and data sources.
