# Development Workflow

This guide keeps local setup fast and predictable. Follow the steps below to boot the app, run migrations, and keep tooling consistent.

## Prerequisites

- Node.js 18+ and npm 10+.  
- Supabase CLI (`brew install supabase/tap/supabase`) for database migrations.  
- Access to the Azure OpenAI deployment used by your environment.  
- Optional: Upstash Redis (rate limiting), Resend (email), GitHub PAT (issue sync).

## First-Time Setup

```bash
npm install
supabase db start        # launches Postgres locally
supabase db reset        # applies migrations from supabase/migrations
cp .env.example .env.local
```

Fill out the `.env.local` file with the variables below. Use staging credentials unless you are debugging production-specific issues.

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (shared with browser). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only). |
| `NEXT_PUBLIC_APP_URL` | Base URL used in emails and redirects. |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint. |
| `AZURE_OPENAI_API_KEY` | API key for OpenAI calls. |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment/model identifier. |

### Common Optional Variables

| Variable | When to set it |
|----------|----------------|
| `NEXT_PUBLIC_ENABLE_ERROR_REPORTING` | Enables client error capture UI. |
| `PROXY_ALLOWED_HOSTS` | Comma-separated allowlist for `/api/proxy`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Activate Redis-backed rate limiting. |
| `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | Send transactional email through Resend. |
| `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` | Enable GitHub diagnostics and issue sync endpoints. |
| `ENABLE_TEST_ENDPOINTS` / `ENABLE_GITHUB_TEST_ENDPOINTS` | Unlock diagnostic APIs in non-production environments. |

See `src/lib/env.ts` for the authoritative list.

## Day-to-Day Commands

```bash
npm run dev            # start Next.js on http://localhost:3000
npm run build          # production build (uses 4GB Node heap)
npm run lint           # ESLint
npm test               # Jest unit tests
npm run db:types       # regenerate Supabase TypeScript types
supabase db push       # apply migrations to linked Supabase project
```

Use `scripts/cleanup.sh` to wipe generated artefacts (`.next`, `node_modules`, `test-results`, `tsconfig.tsbuildinfo`) and reinstall dependencies when the tree becomes inconsistent.

## Coding Standards

- Prefer the shared utilities in `src/lib/**` before adding new helpers.  
- Keep feature logic behind API endpoints; avoid accessing Supabase directly from client components unless that data is truly public.  
- Co-locate tests with their domain when possible (`src/__tests__`, `src/lib/**/__tests__`).  
- When introducing a new feature, update `docs/features.md` so other teams know where to look.

## Troubleshooting

- **Auth issues**: clear cookies or run `scripts/cleanup.sh` to reset the `.next` cache. Verify Supabase env vars.  
- **Migrations missing**: ensure `supabase db status` shows all migrations applied; commit SQL files before PRs merge.  
- **Azure failures**: retry with `ENABLE_HEALTH_DIAGNOSTICS` turned on to get verbose logging; check quota in Azure portal.  
- **Rate limit errors locally**: unset the Upstash env vars or reset Redis with `supabase db stop` followed by `start` if using embedded Redis.
