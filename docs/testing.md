# Testing Guide

Automated coverage currently focuses on unit/integration tests written with Jest. Browser-based E2E coverage (Playwright) was intentionally removed to streamline the repo; restore it only when we have time to maintain realistic scenarios.

## Commands

```bash
npm test             # run Jest once
npm run test:watch   # watch mode
npm run test:coverage
```

Configuration lives in `jest.config.js` (App Router compatible) with setup in `jest.setup.ts` (testing-library, jest-dom).

## Test Locations

- `src/__tests__` – API utilities, auth helpers, and business logic.  
- `src/lib/**/__tests__` – module-level tests collocated with their targets.  
- `src/hooks/__tests__` – React hooks behaviour.  
- Mock data sits under `src/mocks/*` when required (keep fixtures minimal).

## Manual Regression Checklist

Until E2E automation returns, cover these paths manually before releases:

1. **Auth** – login, password reset, invite acceptance (`/auth/*`).  
2. **Brands** – create, edit, delete brands; verify guardrails and admin invites (`src/app/dashboard/brands`).  
3. **Content workflows** – generate new content, progress through workflow steps, verify notifications (`src/app/dashboard/content`).  
4. **Templates** – create/update templates, ensure dependent content regenerates as expected (`src/app/dashboard/templates`).  
5. **AI tools** – run metadata/alt-text/transcreation with and without brand access (`/dashboard/tools`).  
6. **Notifications & tasks** – confirm `/api/me/tasks` reflects workflow changes and notifications mark as read.

Document gaps or flaky behaviours in GitHub issues so we can prioritise reinstating automated coverage.

## Adding New Tests

- Prefer pure functions and domain helpers; they run faster and reduce mocking.  
- For API routes, extract logic into `src/lib/**` modules so you can cover behaviours without spinning up Next.js.  
- If a scenario demands full-stack coverage, prototype a Playwright script under `scripts/testing/` but keep it opt-in until we settle on long-term tooling.
