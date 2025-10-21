# Content Vetting Agency Discovery

## Current Implementation
- Hard-coded agency catalog lives in two places:
  - `src/lib/constants/vetting-agencies.ts` provides rich data (id, name, description, priority) keyed by ISO country code with a “general” fallback.
  - `src/lib/azure/openai.ts` exposes a smaller `VETTING_AGENCIES_BY_COUNTRY` map used to embellish AI outputs.
- Supabase stores brand selections:
  - `public.content_vetting_agencies` table holds persisted agencies.
  - `brands.content_vetting_agencies` (text[]) captures selections alongside `brand_selected_agencies` relation.
  - `create_brand_and_set_admin` RPC accepts `brand_content_vetting_agencies_input`.
- Dashboard flows:
  - Brand create/edit pages load all agencies via `/api/content-vetting-agencies`.
  - Identity generation endpoint (`/api/brands/identity`) merges AI results with selections, deduplicates using a lookup map.
  - No geo/category awareness beyond simple country filters.
- API endpoints simply return the static list; no personalization or discovery based on brand metadata.

## Identified Gaps
- Manual list is difficult to scale and misses emerging regulators (e.g., Hong Kong TIC, Taiwan FDA).
- Double maintenance between constants file and AI helper.
- No link to brand categories; highly regulated segments (infant nutrition, medical devices) need specific agencies.
- No feedback loop—chosen agencies never influence future recommendations.
- Hard-coded defaults risk being stale or incorrect for markets where regulations change quickly.

## Proposed Direction
1. **Unified data service**
   - Create a single source (e.g., `vetting-agency-service.ts`) that:
     - Loads persisted agencies from Supabase (first-party list).
     - Falls back to curated static defaults when the DB is empty.
     - Exposes utilities to query by country, language, and category.
   - Deprecate the hard-coded exports in `constants` and `azure/openai.ts`.

2. **AI-driven recommendation pipeline**
   - Inputs: brand country, preferred languages, optional NAICS/category tags, existing agencies.
   - Prompt template instructs the model to return a structured JSON payload (name, description, regulatory scope, rationale).
   - Post-processing:
     - Validate country code vs supported list.
     - Identify if agency already exists in DB; if not, add as “pending-verification” status.
     - Capture confidence scores and disclaimers for human review.

3. **Human-in-the-loop workflow**
   - Introduce an “Agency Catalogue” admin screen to approve/reject AI-suggested agencies before they become selectable defaults.
   - Maintain metadata: regulatory domain, category fit, official URL.
   - Allow admins to override priorities per country.

4. **Brand workflow updates**
   - Replace the static combobox with a two-tier selection:
     - *Recommended* (AI output filtered to approved agencies).
     - *Full catalogue* (searchable list).
   - Surface rationale/tooltips explaining the AI recommendation.
   - Log user overrides to feed back into future prompts.

5. **Audit & Observability**
   - Log which agencies were suggested, accepted, or dismissed per brand.
   - Schedule periodic re-evaluation when country/category changes.
   - Alert if no agencies can be suggested (fallback to general template).

## Discovery Tasks
1. Map data flow from brand creation through API persistence to dashboard display (done above).
2. Inventory existing agency records in Supabase to determine coverage and gap analysis.
3. Draft AI prompt with expected JSON schema and error-handling steps.
4. Define minimal admin UI requirements to manage AI-sourced agencies.
5. Assess Supabase migrations needed for agency metadata (status, category tags, provenance).

## Risks & Mitigations
- **Regulatory accuracy**: Mitigate by requiring human approval before AI suggestions become defaults.
- **Prompt drift**: Version control prompt templates; add regression tests for sample brands.
- **Performance**: Cache approved agencies per country; only invoke AI when missing data.
- **Tenant safety**: Ensure the AI does not hallucinate sensitive agency names—validate against public registries where possible.

## Next Steps
1. Export current agency table and quantify missing markets (Hong Kong, Taiwan, etc.).
2. Prototype the AI prompt using existing brand samples; evaluate response quality.
3. Draft Supabase schema changes (agency status, categories, source).
4. Prepare a technical design doc for the unified agency service and admin workflow.
5. Align with compliance stakeholders to validate the human-in-the-loop process.
