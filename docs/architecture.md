# System Architecture

MixerAI runs entirely inside a Next.js 14 monorepo. The App Router provides both the dashboard UI and the API surface, with Supabase supplying authentication, row-level security, and persistent storage. Azure OpenAI is used for AI-assisted tooling.

```
Browser (React 18 + App Router)
        │      ▲
        │      │ apiFetch / React Query / Supabase client
        ▼      │
Next.js server (Edge/Node runtimes)
        │
        ├─ Supabase (Postgres + Auth + Storage)
        ├─ Azure OpenAI (text generation/transcreation)
        └─ Upstash Redis (optional rate limiting)
```

## Application Layers

### 1. Routing & Layout
- `src/app/layout.tsx` bootstraps global providers (theme, query client, toasts, CSRF initialiser).
- Each dashboard section lives under `src/app/dashboard/*` and mixes Server Components (data bootstrapping) with client components for interactivity.
- Authentication pages (`src/app/auth/*`) interact with Supabase auth flows.

### 2. API Surface
- Route handlers live in `src/app/api/**/route.ts`.
- Shared wrappers in `src/lib/auth/api-auth.ts` add Supabase session validation, derived role enforcement, CSRF protection, and structured logging.
- `src/lib/api-utils.ts` standardises error handling and database-failure fallbacks.
- Tools that hit third-party services (Azure OpenAI, GitHub) sit in dedicated modules under `src/lib/azure` and `src/lib/github`.

### 3. Domain Libraries
- `src/lib` contains reusable logic for AI prompts, claims, notifications, rate limiting, caching, and security.
- Hooks and providers under `src/hooks`, `src/contexts`, and `src/providers` expose domain data (brands, content, auth) to React components.
- UI primitives (`src/components/ui`, Tailwind CSS) and feature components (`src/components/content`, `src/components/dashboard`) compose dashboard screens.

### 4. Data & Integrations
- Supabase schema and stored procedures live in `supabase/migrations`. Service-role access is limited to API routes that must bypass RLS.
- Azure OpenAI calls are centralised in `src/lib/azure/openai.ts` to ensure deployment names, retries, and budget controls stay consistent.
- Optional Redis usage (e.g. rate limiting via Upstash) is abstracted behind `src/lib/rate-limit.ts`. When not configured the app falls back to in-memory enforcement.

## Deployment Considerations

- **Environment separation**: environment variables control Supabase project, Azure deployment, and optional diagnostics flags (`ENABLE_TEST_ENDPOINTS`, `ENABLE_HEALTH_DIAGNOSTICS`).
- **Static assets**: served from `public/`. Email templates live in `email-templates/`.
- **Migrations**: run `supabase db push` or apply SQL in `supabase/migrations` before deploying new API routes that expect schema changes.
- **Error reporting**: API utilities return structured `{ success, error, code }` responses; client components surface them through toasts and inline alerts.
