# Claims Utilities Function Review Plan

This document tracks the ongoing function-by-function review of `src/lib/claims-utils.ts`. Update the status and notes as each function is evaluated and remediated.

| Function | Status | Notes |
| --- | --- | --- |
| `normalizeSingleRow` | Completed | Behaviour already matches Supabase response shapes; no code changes required. |
| `fetchSingleRow` | Completed | Wrapper logic remains valid after refactor; no additional changes needed. |
| `getStackedClaimsForProduct` | Completed | Refactored into typed helpers, added override shadowing to avoid duplicate outputs, and ensured Supabase fetches are modular & testable. Covered by updated `global-overrides`/`replacement-dedupe` suites. |
| `dedupeByFinalText` | Completed | Hardened precedence to treat non-master rows with missing country metadata as market claims and added regression coverage for the edge case. |
| `isGlobalCountryCode` | Completed | Reviewed helper; behaviour already covered by existing tests so no implementation changes required. |
| `getStackedClaimsForProductRPC` | Completed | Added parameter validation, typed RPC responses, and early exit tests to ensure safe fallbacks when the RPC fails or is misused. |

## Claims Service (`src/lib/claims-service.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `ttl` | Completed | Existing fallback logic handles invalid env input; no changes required. |
| `getEffectiveClaimsCached` | Completed | Behaviour aligns with stacking helpers and cache contract; no changes required. |
| `invalidateClaimsCacheForProduct` | Completed | Mirrors cache prefix semantics without issues. |
| `invalidateAllClaimsCache` | Completed | Global cache invalidation already correct. |

## Claims API Helpers (`src/lib/api/claims-helpers.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `checkProductClaimsPermission` | Completed | Swapped to structured logging and kept brand permission checks intact. |
| `fetchClaimsWithRelations` | Completed | Uses static globals for filtering; no further changes required. |

## Claims Route (`src/app/api/claims/route.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `GET` | Completed | Uses structured logging and direct constants while retaining filters/pagination. |
| `POST` | Completed | Uses structured logging and retains validation/permission flow for claim creation. |

## Product Stacked Claims API (`src/app/api/products/[productId]/stacked-claims/route.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `GET` | Completed | Pulls productId from route params (with pathname fallback) and preserves validation guards. |

## API Client (`src/lib/api-client.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `getCSRFToken` | Completed | Shared cookie parsing logic now decodes values and gracefully handles missing cookies. |
| `createClientError` | Completed | Behaviour confirmed; leveraged by retry guard to avoid duplicate attempts. |
| `apiFetch` | Completed | Added abort/error-type guards so only network faults retry; CSRF header reuse verified. |
| `parseJsonResponse` | Completed | Treats empty/whitespace bodies as optional and preserves raw text in error payloads. |
| `apiFetchJson` | Completed | Relies on improved JSON parser; no further changes required. |
| `apiClient` helpers | Completed | Normalises request bodies (FormData, streams, JSON) and aligns headers; added regression tests. |

## API Utilities (`src/lib/api-utils.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `isProduction` | Completed | Falls back to `NODE_ENV` so non-Vercel deploys detect production correctly. |
| `isBuildPhase` | Completed | Recognises both `phase-production-build` and export phases. |
| `isDatabaseConnectionError` | Completed | Uses curated code/pattern lists to avoid misclassifying generic auth failures. |
| `handleApiError` | Completed | Centralised logging message and honours refined connection/RLS handling. |
| `fetchCountries` | Completed | Handles legacy `countries` payloads and resilience-tested. |
| `fetchProducts` | Completed | Normalises array handling when API returns unexpected payloads. |
| `fetchClaims` | Completed | Validates product IDs, sanitises URLs, and improves failure fallbacks. |

## API Error Utilities (`src/lib/api/error-utils.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `isPostgrestError` | Completed | Guards for string code/message/details before treating errors as PostgREST. |
| `getPostgrestErrorStatus` | Completed | Handles mixed-case codes and defaults cleanly. |
| `getPostgrestErrorMessage` | Completed | Provides friendly text then falls back to details/hint when unmapped. |
| `formatZodError` | Completed | Adds root fallback and concise summary for multi-field issues. |
| `isRateLimitError` | Completed | Detects 429 status and common message patterns robustly. |
| `isAuthError` | Completed | Checks status codes, PostgREST auth codes, and token error phrasing. |
| `apiErrorResponses` helpers | Completed | Centralised response builder with header normalisation and Retry-After guards. |
| `handleEnhancedApiError` | Completed | Passes PostgREST context, improved fallbacks, and keyword-based classification. |

## RLS Helpers (`src/lib/api/rls-helpers.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `isRLSError` | Completed | Normalises codes to uppercase before matching Postgres/PostgREST RLS identifiers. |
| `extractTableFromRLSError` | Completed | Detects both table and relation references in policy messages. |
| `handleRLSError` | Completed | Logs structured payload and responds with timestamped 403 including table metadata. |
| `validateRLSFields` | Completed | Treats missing/null/empty fields as gaps while respecting falsy values. |
| `preValidateRLSPermission` | Completed | Adds user guard, role-specific messaging, and safe defaults for unknown tables. |
| `RLS_SAFE_OPTIONS` | Completed | Emits structured warnings and swallows RLS failures without breaking callers. |

## File Upload Middleware (`src/lib/api/middleware/file-upload.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `withFileUploadValidation` | Completed | Returns structured JSON errors (missing file, invalid metadata/content) and bubbles sanitized details to callers. |

## CSRF Wrappers (`src/lib/api/with-csrf.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `withCSRF` | Completed | Returns 403 with timestamped CSRF payload before any handler logic executes. |
| `withAuthAndCSRF` | Completed | Memoises auth wrapper import and composes CSRF checks for downstream handlers. |

## API Error Handler (`src/lib/api/error-handler.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `createErrorResponse` | Completed | Adds timestamp/code fields, honours ApiClientError statuses, and supports optional detail output. |
| `createSuccessResponse` | Completed | Emits timestamped payloads for consistent telemetry. |
| `getErrorStatus` | Completed | Checks ApiClientError/Response/status props before falling back to message heuristics. |
| `handleStandardApiError` | Completed | Delegates to enhanced response builder with derived status. |

## API Validation (`src/lib/api/validation.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `validateRequest` | Completed | Uses safe parsing, structured error responses, optional custom parsers, and timestamped payloads. |
| `validatePaginationParams` | Completed | Leverages shared pagination schema to normalise page/limit and offset. |
| `commonSchemas` | Completed | Reusable zod primitives confirmed (including refined date range). |

## API Response Helpers (`src/lib/api/responses.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `apiSuccess` | Completed | Returns timestamped payloads with optional message/pagination headers + status overrides. |
| `apiError` | Completed | Wraps structured JSON errors with code/timestamp + optional details/options. |
| `calculatePagination` | Completed | Safeguards totals and page flags for zero-count datasets. |
| `getPaginationParams` | Completed | Coerces params with sane defaults and caps limit at 100. |

## CSRF Core (`src/lib/csrf.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `generateCSRFToken` | Completed | Generates 32-byte cryptographic token (hex) verified via unit coverage. |
| `validateCSRFToken` | Completed | Trims header/cookie tokens, skips safe methods, and reuses timing-safe compare. |
| `shouldProtectRoute` | Completed | Uses regex to bypass auth/webhook/public paths and static assets. |
| `CSRF_ERROR_RESPONSE` | Completed | Constant consumed by `withCSRF`; response timestamp injected by wrapper. |

## Rate Limit Middleware (`src/lib/rate-limit-simple.ts`)

| Function | Status | Notes |
| --- | --- | --- |
| `toAdvancedConfig` | Completed | Preset pass-through already correct; retained while consumers now expose meaningful headers. |
| `getRateLimitType` | Completed | Normalises path casing and confines to API routes before selecting presets. |
| `checkRateLimit` | Completed | Adds try/catch fallback with structured logging; preserves headers when backend responds. |
