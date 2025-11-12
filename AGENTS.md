# Repository Guidelines

## Project Structure & Module Organization
The Next.js 14 code lives in `src/`: App Router pages in `src/app`, shared UI in `src/components`, domain helpers in `src/lib`, and contexts/providers inside `src/contexts` and `src/providers`. Feature copy, mocks, and seeds sit in `src/content` and `src/mocks`. Tests live in `src/__tests__`; long-form docs in `docs/`; static assets in `public/`; automation scripts in `scripts/`; Supabase migrations and type generators in `supabase/`.

## Build, Test, and Development Commands
`npm run dev` starts the local server on http://localhost:3000. `npm run build` performs the production build (extra memory included) and `npm run start` serves the optimized bundle. `npm run check` runs `next lint` plus `tsc` in one pass. Use `npm run test`, `npm run test:watch`, and `npm run test:coverage` for the Jest suite. Dry-run database pushes with `npm run db:push:dry` before running `npm run db:push`.

## Coding Style & Naming Conventions
Stick to TypeScript, two-space indentation, and functional React components. Components, contexts, and hooks adopt `PascalCase`; helpers and instances use `camelCase`, and hooks start with `use` inside `src/hooks`. Tailwind CSS is the default styling layer—prefer utility classes inline and fall back to CSS modules only for complex layouts. Run `npm run lint` (or `npm run review:fix` for autofixes) before every pull request.

## Testing Guidelines
Jest with Testing Library drives unit and integration tests (`jest.config.js`, `jest.setup.ts`). Name specs `*.test.ts(x)` and mirror the source folder so intent stays obvious. Focus on user-facing behaviors, Supabase mutations, and AI workflows; stub outbound calls with helpers in `src/mocks`. Aim for ≥80% coverage on critical modules and confirm with `npm run test:coverage`.

## Commit & Pull Request Guidelines
Commit messages follow a lightweight Conventional Commits style (`feat:`, `fix:`, `chore:`) that states scope and outcome. Each PR must summarize user-facing changes, link the relevant issue, attach UI screenshots when applicable, and call out migrations or scripts that reviewers must run (`scripts/setup-issue-screenshots.js`, Supabase pushes, etc.). Ensure `npm run check && npm run test` pass locally and note any deferred work in the description.

## Security & Configuration Tips
Never commit `.env` files; follow `README.md`, `docs/azure_openai_integration.md`, and `docs/database.md` when sourcing secrets. Pair any schema or role change with regenerated types via `npm run db:types`. For AI features, keep experiments behind flags and run `scripts/check-breed-guide-output.js` plus `scripts/verify-openai-integration.js` to validate safety before shipping.
