# Frontend Guide

The UI is a Next.js App Router application written in TypeScript and Tailwind CSS. Server Components load initial data, while client components handle interactivity and realtime updates.

## Directory Map

| Path | Purpose |
|------|---------|
| `src/app` | App Router routes (dashboard, auth flows, marketing pages, API handlers). |
| `src/components` | Reusable UI pieces—ShadCN-style primitives under `ui/`, domain components (`content/`, `dashboard/`), layout shells, dialogs, and forms. |
| `src/hooks` | Client hooks wrapping React Query (`queries/`), Supabase, and UI state helpers (`use-auto-save`, `use-session-timeout`). |
| `src/contexts` | React context providers for auth and active brand state. |
| `src/providers` | Global top-level providers (React Query, theme, toasts). |
| `src/lib/utils` | Formatting helpers (markdown, date, string limits) used by screens and components. |

## Rendering Model

- **Server Components**: default for `/dashboard/*/page.tsx`. They fetch critical data (via Supabase admin client or internal APIs) and pass props down.
- **Client Components**: suffixed with `-client.tsx` or annotated with `'use client'`; they handle mutations, optimistic updates, and subscribe to React Query caches.
- **React Query**: `src/providers/query-provider.tsx` initialises a shared client; hooks under `src/hooks/queries` wrap API endpoints and provide caching/retry defaults.
- **Form handling**: `react-hook-form` + Zod validators (`src/lib/validation`) ensure consistent error messages and TypeScript inference.
- **Styling**: Tailwind CSS with `tailwind-merge` and `clsx`; component-level styling via utility classes and shared patterns in `src/components/ui`.

## Global Providers

`src/app/layout.tsx` chains these providers:

1. `ThemeProvider` for light/dark theming (`next-themes`).
2. `QueryProvider` (React Query) with devtools enabled in dev.
3. `Toaster` notifications (`src/components/sonner.tsx`).
4. `CSRFInitializer` to seed CSRF tokens for API calls.
5. `AuthContextProvider` and `BrandContextProvider` (where applicable) to expose user and brand metadata across the dashboard.

## Client Utilities

- `src/lib/api-client.ts` supplies `apiFetch` / `apiFetchJson`—a wrapper around `fetch` that injects credentials, handles CSRF headers, and normalises responses.
- `src/components/csrf-initializer.tsx` pairs with `api-client` to ensure the CSRF token cookie exists before mutations run.
- `src/hooks/use-toast-handlers.ts` standardises how async operations surface success/error toasts.

## Page Patterns

- **Dashboard tables**: `src/components/dashboard` houses shared table, filter, and pagination components. Lists typically load data in a Server Component, then hydrate client logic for search/sort using React Query.
- **Detail editors**: Files like `src/app/dashboard/content/[id]/page.tsx` split into a small server shell plus `content-page-client.tsx` for live updates, websockets (future), and supabase interactions.
- **Modals & dialogs**: Provided by Radix-based components in `src/components/ui`. Confirm flows (delete, publish) centralise logic in `src/components/confirm-dialog.tsx`.

## UI Theming & Accessibility

- Tailwind config lives at `tailwind.config.js`; typography and form plugins are enabled.
- `src/components/ui/showcase.tsx` documents available primitives.
- Accessibility guidelines: use Radix primitives for keyboard handling, keep `aria-*` on custom components, and prefer semantic elements (tables for data, buttons for actions).

## Adding a New Screen

1. Create a directory under `src/app/dashboard/<feature>` with `page.tsx` (Server Component).  
2. Fetch initial data via internal APIs or direct Supabase queries (service role only on the server).  
3. Extract interactive pieces into `use client` components under `src/components/<feature>` and wire them with React Query hooks.  
4. Reuse `apiFetch` for mutations; surface outcomes via `useToastHandlers`.  
5. Add skeleton/loading states by returning `Suspense` boundaries or dedicated skeleton components.
