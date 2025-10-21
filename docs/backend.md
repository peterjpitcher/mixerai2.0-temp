# Backend & API Guide

All backend code runs inside the Next.js App Router. Route handlers live under `src/app/api/**/route.ts` and are composed with shared higher-order utilities for auth, CSRF, logging, and error handling.

## Request Lifecycle

1. **Incoming request** hits `/api/...`.
2. **Auth guard** wraps the handler via `withAuth`, `withAuthAndMonitoring`, or `withAuthMonitoringAndCSRF` (`src/lib/auth/api-auth.ts`).  
   - Retrieves the Supabase session from cookies.  
   - Normalises the derived global role (`applyDerivedGlobalRole`).  
   - Adds CSRF validation when required.
3. **Business logic** executes inside the handler. Most routes call into helpers in `src/lib/**` or Supabase RPCs.
4. **Response** is returned as JSON `{ success, data?, error?, code? }`. Failures funnel through `handleApiError` (`src/lib/api-utils.ts`) to ensure consistent status codes.

## Auth & Security

- **Supabase clients**: `createSupabaseAdminClient()` (service role, server only) and `createSupabaseClient()` (browser singleton) in `src/lib/supabase/client.ts`.
- **CSRF protection**: `withCSRF` middleware + `src/components/csrf-initializer.tsx` seed and validate the token for state-changing routes.
- **Brand access checks**: `userHasBrandAccess` (`src/lib/auth/brand-access.ts`) protects brand-scoped operations.
- **Rate limiting**: `src/lib/rate-limit.ts` wraps Upstash Redis or in-memory limits. Some tool endpoints implement local counters (e.g., content transcreator).
- **Error reporting**: `handleApiError` distinguishes between database outages, RLS violations, and generic failures. Logs contain Postgres codes when available.

## Major API Areas

| Feature | Routes | Key Helpers |
|---------|--------|-------------|
| Brands | `/api/brands`, `/api/brands/identity`, `/api/master-claim-brands` | `src/lib/brands/*`, Supabase tables `brands`, `brand_selected_agencies`, `brand_master_claim_brands`. |
| Templates | `/api/content-templates` and `/api/content-templates/[id]` | Template parsing/validation in `src/lib/content/templates`. |
| Content & Workflows | `/api/content`, `/api/content/[id]/**`, `/api/workflows` | Workflow orchestration lives in `src/lib/content`, notifications in `src/lib/notifications`. |
| Tasks & Assignments | `/api/me/tasks`, `/api/users/search`, `/api/users/resend-invite` | Uses Supabase views and RPCs for task aggregation. |
| Tools (AI) | `/api/tools/alt-text-generator`, `/api/tools/metadata-generator`, `/api/tools/content-transcreator` | Azure OpenAI wrapper (`src/lib/azure/openai.ts`), audit trails in `tool_run_history`. |
| Diagnostics & Integrations | `/api/health`, `/api/github/*`, `/api/errors/track` | Feature-flagged via env vars such as `ENABLE_HEALTH_DIAGNOSTICS`, `ENABLE_GITHUB_TEST_ENDPOINTS`. |

## Azure OpenAI Integration

- Central implementation: `src/lib/azure/openai.ts`.  
- Supports deterministic prompts for guardrails, metadata, and transcreation.  
- Handles retries, token usage logging, and error normalisation.  
- Endpoint configuration via `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME`.

## GitHub & External Services

- GitHub issue automation lives under `src/app/api/github`. Authentication uses the personal access token stored in `GITHUB_TOKEN`.
- Email delivery uses Resend (`src/lib/email/resend.ts`); falls back gracefully when `RESEND_API_KEY` is missing.
- Optional Redis caching/rate limiting uses Upstash REST credentials.

## Creating a New API Route

1. Create a directory under `src/app/api/<resource>/route.ts`.  
2. Wrap exports with the appropriate auth helper (`withAuth` for read, `withAuthMonitoringAndCSRF` for writes).  
3. Use `createSupabaseAdminClient()` for RLS-protected operations. Avoid exposing the service role on the client.  
4. Validate payloads with Zod schemas to return structured 400s.  
5. Surface errors via `handleApiError` and include helpful `code` or `hint` fields.  
6. Add unit tests in `src/__tests__` where practical, or integration scripts under `scripts/testing/`.
