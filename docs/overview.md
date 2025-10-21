# Product Overview

MixerAI helps content, brand, and workflow teams generate compliant marketing assets quickly while keeping guardrails enforced. The platform combines a Next.js 14 front end, Supabase for auth/data, and Azure OpenAI powered tooling.

## Core User Journeys

- **Brand admins** define identities, guardrails, and agencies (`src/app/dashboard/brands` + `/api/brands`).  
- **Editors and reviewers** create, vet, and approve content through multi-step workflows (`src/app/dashboard/content`, `/api/content`, `/api/workflows`).  
- **Template designers** maintain structured content templates and release notes (`src/app/dashboard/templates`, `/api/content-templates`).  
- **Automation specialists** run AI-powered tools (alt text, metadata, transcreation) while logging usage to Supabase (`src/app/dashboard/tools`, `/api/tools/*`).

## Major Services

| Layer | Responsibility | Highlights |
|-------|----------------|------------|
| Next.js App Router (`src/app`) | UI + API routes | Server Components for layout, client components where interactivity/state is required |
| Supabase Auth & Database (`supabase/`) | RBAC, workflows, template + content storage | `supabase/migrations` defines schema; service role used only on the server |
| Azure OpenAI (`src/lib/azure/openai.ts`) | Content generation & enrichment | Wrapper handles retries, token accounting, prompt templates |
| Background utilities (`src/lib/*`) | API client, caching, rate limits, logging | `api-client.ts`, `rate-limit.ts`, `logger.ts`, and domain helpers |

## Key Principles

- **Security-first API access**: all mutations pass through `withAuth`/`withAuthMonitoringAndCSRF`, CSRF tokens are initialised client-side via `src/components/csrf-initializer.tsx`.  
- **Supabase as source of truth**: the Next.js server uses `createSupabaseAdminClient` for privileged calls, while the browser uses a singleton from `createSupabaseClient`.  
- **Composable features**: features expose reusable React hooks (`src/hooks`), context providers (`src/contexts`), and UI primitives (`src/components/ui`) so flows stay consistent across dashboard pages.  
- **Lean documentation**: the rest of the docs directory is intentionally small—if a topic is not covered, add it as a focused page rather than recreating the old tree.
