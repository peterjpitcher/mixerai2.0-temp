# Claims System

This doc summarizes claims constants, precedence rules, data flow, caching, and observability.

- Sentinels:
  - `__GLOBAL__` (`GLOBAL_CLAIM_COUNTRY_CODE`) for global claims rows
  - `__ALL_COUNTRIES__` (`ALL_COUNTRIES_CODE`) for overrides and UI “All Countries”
  - Never pass `__ALL_COUNTRIES__` to stacked-claims endpoint

- Precedence:
  - Override > Market > Master
  - Tie-break within same tier: Product > Ingredient > Brand
  - Replacement de-dup keeps a single final `claim_text`

- Stacked flow:
  - Fetch brand/product/ingredient claims for `[countryCode, __GLOBAL__]`
  - Fetch overrides for `[countryCode, __ALL_COUNTRIES__]` and pick market-specific over global per `master_claim_id`
  - Compose in a single pass and de-dup by final text using precedence

- Caching:
  - Key: `stacked:${productId}:${countryCode}`
  - TTL: `CLAIMS_CACHE_TTL` (default 300s)
  - Invalidate on claims and overrides mutations (`stacked:${productId}:*` or `stacked:` fallback)

- API contracts:
  - `/api/countries` => `{ success, countries }`
  - `/api/products/:id/stacked-claims?countryCode=GB` => `EffectiveClaim[]`
  - `/api/claims/matrix?countryCode=GB` => matrix data structure

- Observability:
  - `x-correlation-id` added via `withCorrelation`
  - Timings via `timed()` helper (logs in debug)

- KPIs:
  - Stacked-claims P95 < 200ms cached / < 500ms cold
  - Matrix P95 < 500ms
  - Cache hit rate > 60% after warm-up

