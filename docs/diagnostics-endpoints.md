# Diagnostics & Test Endpoints

This note captures the current footprint of diagnostic HTTP routes so we can plan their retirement.

## Runtime Gates

- All `/api/test-*` routes now require the caller to be an authenticated admin _and_ have `ENABLE_TEST_ENDPOINTS=true` in the environment. When the flag is false, they return `410` with guidance to enable the flag locally.
- `/api/github/*` diagnostics follow the same pattern behind `ENABLE_GITHUB_TEST_ENDPOINTS=true`.
- `/api/env-check` and `/api/proxy` remain admin-only. `env-check` emits sanitised payloads, while the proxy enforces the new allowlist and structured `{ success, proxied }` envelope.

## Retirement Guidance

| Route group | Production behaviour | Local usage notes |
|-------------|----------------------|-------------------|
| `/api/test-connection`, `/api/test-template-generation`, `/api/test-brand-identity`, `/api/test-templates`, `/api/test-metadata-generator`, `/api/test-user-permissions`, `/api/test-template-route/*`, `/api/test-azure-openai` | 404 in production (flag disabled). Admin+flag in non-prod. | Keep flagged for QA automation only. Remove once parity scripts move to CLI. |
| `/api/github/*` | 404 in production (flag disabled). Admin+flag when testing GitHub auth. | Documented for developer support; candidates for deletion after GitHub sync launches. |
| `/api/proxy` | Allowlist-enforced proxy with structured response. | Replace ad-hoc curl usage with internal tooling; do not expose to non-admins. |
| `/api/env-check` | Admin-only diagnostics with scrubbed config values. | Safe for ops triage; avoid exposing secrets. |

## Front-end Expectations

- Dashboard tools hide diagnostic cards for non-admin roles. When no tools are available for the current user, a gated message is shown instead of empty navigation.
- Any UI calling `/api/proxy` or `/api/env-check` must respect the `{ success, error? }` envelope and surface the returned message to support teams. Blocked responses should trigger a toast so the user can relay the allowlist reason to admins.

_Last updated: 2025-09-18_
