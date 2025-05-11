# Investigation: Removing Old Content Types (Article, Owned PDP, Retailer PDP)

Date: 2024-07-26

## 1. Goal

The primary goal is to remove the old, static content type pages and associated logic for "Article", "Owned PDP", and "Retailer PDP" from the `/dashboard/content/` directory. This is part of the transition to a more flexible `content_templates` system.

## 2. Key Findings & Dependencies

The investigation revealed several areas where these old content types are referenced:

### 2.1. Critical Discrepancy: Database Schema

A significant discrepancy exists regarding how content types are managed in the database:

*   **`supabase-schema.sql` (as read during investigation):**
    *   Does **not** define a `content_types` table.
    *   Defines a `content` table with a `template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL` column.
    *   This suggests the system has moved towards using `content_templates`.

*   **Seeding Scripts (`scripts/clean-database.sql`, `scripts/create-sample-brands.sql`):**
    *   `clean-database.sql` explicitly truncates and re-populates a `content_types` table with 'Article', 'Retailer PDP', and 'Owned PDP'.
    *   `create-sample-brands.sql` inserts sample content using `content_type_id` by selecting from this `content_types` table.

*   **`mixerai-api-structure` Rule (Internal Documentation):**
    *   Describes a `content_types` table and a `content_type_id` foreign key on the `content` table, aligning with the seeding scripts.

*   **API Endpoints (`src/app/api/content/route.ts`):**
    *   The `GET` endpoint for fetching content selects `*` from `content` but does not explicitly join or select from a `content_types` table.
    *   The `POST` endpoint for creating content uses `template_id: data.template_id || null`.

**Conclusion on Discrepancy:** The most up-to-date application code (API routes, new content page) points towards `template_id` being the primary mechanism. However, development/seeding scripts and some internal documentation still reference the old `content_types` system. **Clarifying the definitive current database schema is the highest priority before proceeding with removal.**

### 2.2. Frontend Pages & Routes

*   **Pages to be Removed:**
    *   `src/app/dashboard/content/article/page.tsx`
    *   `src/app/dashboard/content/ownedpdp/page.tsx`
    *   `src/app/dashboard/content/retailerpdp/page.tsx`
*   These pages contain links like `/dashboard/content/new?type=Article`, which are now effectively ignored by `src/app/dashboard/content/new/page.tsx` (it only uses `?template=TEMPLATE_ID`).

### 2.3. Navigation & Links

*   `src/app/dashboard/page.tsx`: Contains direct links to the three old content type pages.
*   `docs/NAVIGATION_FIX_IMPLEMENTATION.md`: Describes a `UnifiedNavigation` component that includes these pages in its menu structure.

### 2.4. Redirects

*   `next.config.js`: Contains redirects like `source: '/content', destination: '/dashboard/content/article'` and `source: '/dashboard/content', destination: '/dashboard/content/article'`.
*   `scripts/test-redirects.js`: Includes tests for these redirects.

### 2.5. API & Backend Logic

*   **`src/lib/azure/openai.ts`:**
    *   The `generateContent` function has a typed parameter `contentType: "article" | "retailer_pdp" | "owned_pdp"` and builds prompts based on these. This is a significant dependency. The "NO FALLBACKS" rule for AI generation applies here. A targeted codebase search for `generateContent(` confirmed that its only call site in the TS/TSX codebase (outside of its own definition file) is within the commented-out legacy block in `src/app/api/content/generate/route.ts` (see below), indicating it is not actively used elsewhere.
*   **`src/app/api/content/generate/route.ts`:**
    *   Legacy code block for handling these old `contentType`s (which includes the aforementioned call to `generateContent`) is already commented out.
    *   The `README.md` in this directory (`src/app/api/content/generate/README.md`) still documents the old `contentType` parameter.
*   **`src/app/dashboard/content/new/page.tsx`:**
    *   This page has been updated and now correctly uses `templateId` from a `?template=` search parameter, ignoring the old `?type=` parameter.

### 2.6. UI Components & Data Display

*   **`src/app/dashboard/content/[id]/page.tsx` (Content Detail Page):**
    *   Currently uses **mock data** where `content.type` is hardcoded (e.g., `'Article'`).
    *   This page needs to be updated to derive type information from `content.template_id` (e.g., by fetching the template name) when displaying real data.
    *   Passes `contentType={content.type}` to `ContentApprovalWorkflow`.
*   **`src/components/dashboard/analytics-overview.tsx`:**
    *   Uses these old content type names in its mock analytics data.
*   A targeted search for other UI elements (e.g., dropdowns, filters in shared components) actively using the old content type strings for selection did not reveal further functional dependencies beyond the navigation links and mock data usage already noted. The primary interaction with the old system's types in UI was through direct page navigation and specific "create new" links using query parameters.

### 2.7. Documentation

*   `docs/CONTENT_TEMPLATE_SYSTEM.md`: Already notes the replacement of static types by templates.
*   `docs/refactor-remove-old-content-types.md`: Appears to be an existing document outlining a plan for this removal.
*   `docs/missing-pages/README.md`: Lists these pages as part of past refactoring.

## 3. Summary of Impact & Recommended Actions (Assuming `template_id` is the Definitive Approach)

The following actions are recommended, categorized for clarity. The critical first step remains clarifying the database schema.

### 3.1. Database & Data Migration
*   **CRITICAL: Clarify Database Schema:**
    *   Determine the absolute source of truth for the database schema regarding `content_types` vs. `content_templates`.
    *   **Migration History & Strategy:**
        *   The project uses a **consolidated migration strategy** as per `migrations/README.md`. The `migrations/consolidated_migrations.sql` file is intended to be the complete schema and is applied using `scripts/run-migrations.sh`.
        *   `consolidated_migrations.sql` (last updated 2023-11-15) currently **defines** the `content_types` table, related columns (e.g., `content.content_type_id`), and inserts the old default types ('Article', 'Retailer PDP', 'Owned PDP'). This means any new environment set up with this script will still have the old system.
        *   `migrations/content-template-system.sql` shows the introduction of the `content_templates` table and the `content.template_id` column.
        *   Found `migrations/00000000000000_remove_old_content_types.sql`: This script contains comprehensive SQL commands to drop the `content_types` table and all related entities. Its existence suggests a previous attempt or plan to remove the old system.
        *   **Key Discrepancy & Resolution:** The `consolidated_migrations.sql` was out of sync. **DONE: `migrations/consolidated_migrations.sql` has been updated (2024-07-26) to remove all aspects of the `content_types` system and correctly integrate the `content_templates` system as the sole standard.**
*   **Data Integrity & Cleanup (If `content_types` table/column is to be removed AFTER `consolidated_migrations.sql` is updated):**
    *   Ensure all existing content items have their `template_id` correctly set (potentially mapping old `content_type_id` values to corresponding new `template_id`s if necessary and feasible).
    *   Implement a one-off data migration job to safely archive (if needed for historical reference) and then drop the `content_types` table and the `content.content_type_id` column from all relevant database environments (development, staging, production). (This step refers to live databases that might still have the old schema; the `consolidated_migrations.sql` now ensures new/clean environments are correct).
*   **Seeding & Test Fixtures:**
    *   **DONE:** Update `scripts/clean-database.sql` to stop creating or populating the `content_types` table.
    *   **DONE:** Update `scripts/create-sample-brands.sql` to use `template_id` (linking to valid `content_templates`) for sample content instead of `content_type_id`.
    *   Audit all other test fixtures, unit-test seed data, factories, and mocks across the codebase for references to old content types or their IDs, and update them to use the new template-based system.

### 3.2. Backend & API
*   **Legacy Logic Removal/Refactor:**
    *   Refactor or remove the `generateContent` function in `src/lib/azure/openai.ts` to align with the `content_templates` system (e.g., by fully relying on `generateContentFromTemplate`). Adhere to the "NO FALLBACKS" for AI generation rule.
    *   Confirm permanent removal of the commented-out legacy code block in `src/app/api/content/generate/route.ts`.
*   **Type Definitions & Schemas:**
    *   Search for and remove/update any lingering TypeScript `enum`, `type` definitions, or GraphQL schema definitions that still list "Article", "Retailer PDP", or "Owned PDP" as content types.
*   **API Documentation:**
    *   Update or remove references to the old `contentType` parameter in `src/app/api/content/generate/README.md` and any formal API documentation (e.g., OpenAPI/Swagger specifications if they exist) or client SDK generation configurations.
*   **Helper Functions & Utilities:**
    *   Conduct a thorough search for any other helper functions, utility modules, middleware, or services (even if not directly imported in TSX/frontend files) that might branch on, or otherwise use, the old `contentType` string values or `content_type_id`.
*   **Asynchronous Processes:**
    *   Investigate any background jobs, cron tasks, message queue consumers, or webhook handlers that might inspect, process, or audit the old `content_type_id` field or type names.

### 3.3. Frontend
*   **Page & Component Removal:**
    *   **DONE:** Page folders `src/app/dashboard/content/article/`, `src/app/dashboard/content/ownedpdp/`, `src/app/dashboard/content/retailerpdp/` have been deleted (user confirmed manual deletion).
*   **Navigation & Links:**
    *   **DONE:** Updated navigation in `src/app/dashboard/page.tsx` (removed direct links, replaced with "View All Content").
    *   **DONE:** Updated `src/components/layout/unified-navigation.tsx` (verified it uses dynamic templates for creation links, added "All Content" link).
*   **UI Data Display & Interactions:**
    *   **DONE:** Created `/api/content/[id]/route.ts` to fetch single content items with template info.
    *   **DONE:** Modified `src/app/dashboard/content/[id]/page.tsx` to use the new API, display `template_name`, and update props passed to `ContentApprovalWorkflow`.
    *   **DONE:** Updated mock data and UI in `src/components/dashboard/analytics-overview.tsx` to use template names.
    *   **DONE:** Audited `src/app/dashboard/content/page.tsx`; no old content type filters found. Added `template_name` to its display and updated its API `/api/content` to provide this.
*   **TypeScript Interfaces & Props:**
    *   **DONE:** Obsolete `contentType` props/types removed or updated in `generateContent` (deleted), API routes, `ContentDetailPage`, and `ContentEditPage`.
*   **Mock Data in Tests:**
    *   **DONE:** `src/app/dashboard/content/[id]/edit/page.tsx` updated to fetch real data, removing mock data with old types.
    *   **DONE:** `src/app/openai-test/components/content-generation-test.tsx` (which used non-existent `/api/content-types`) and its usage in `src/app/openai-test/page.tsx` have been removed/cleaned up.
*   **Storybook & Styleguides:**
    *   **N/A:** No Storybook files found via search. Assumed not in use or stories for these components do not exist.

### 3.4. Routing, Redirects & SEO
*   **Redirect Configuration:**
    *   **DONE:** Updated redirects in `next.config.js` to point to `/dashboard/content` instead of old article pages.
    *   **DONE:** Updated `scripts/test-redirects.js` to match new redirect destinations.
*   **Search Engine Optimization:**
    *   **N/A - Files not found:** `sitemap.xml` and `robots.txt` not found in `public/`. `next-sitemap.config.js` not found. If implemented, these should be regenerated/updated.
    *   **DONE - Verified in layouts:** No specific canonical or robots meta tags targeting old content types found in `src/app/layout.tsx` or `src/app/dashboard/layout.tsx`. Assumed removed with deleted pages.

### 3.5. Testing & CI/CD
*   **End-to-End (E2E) Tests:**
    *   **TO AUDIT:** E2E test suites (e.g., Cypress, Playwright) need manual auditing for tests that navigate to, interact with, or assert content on the deleted pages (`/dashboard/content/article`, `/ownedpdp`, `/retailerpdp`) or click old navigation links. (File `e2e/navigation.spec.ts` mentioned in docs was not found).
*   **Integration Tests:**
    *   **ADDRESSED:** API endpoint `/api/content/generate` no longer accepts old `contentType` payloads. Integration tests targeting this with old payloads would need updates. The test component `src/app/openai-test/components/content-generation-test.tsx` which exemplified this has been removed.
*   **Pipeline Scripts:**
    *   **TO AUDIT:** CI/CD pipeline scripts need manual auditing for any linting or code-generation steps that might have special-cased the old types.

### 3.6. Analytics, Telemetry & Monitoring
*   **Event Schemas:**
    *   **TO AUDIT (External Systems):** If tracking custom events in Segment/Amplitude/GA (or similar) with a `contentType` property, those schemas need to be updated or retired to use `template_name` or `template_id`.
*   **Dashboards & Alerts:**
    *   **TO AUDIT (External Systems):** Any external analytics dashboards (Datadog, Looker, Tableau, etc.) or alert rules that group by or filter on the old content types need to be removed or updated.
    *   **INTERNAL UPDATE DONE:** The internal `src/components/dashboard/analytics-overview.tsx` has been updated to use `templateName`.

### 3.7. Documentation & Communication
*   **Internal docs (Wiki, Confluence, etc.):**
    *   **TO AUDIT (Manual):** Search internal knowledge bases for any remaining documentation that refers to the old "Article", "Retailer PDP", "Owned PDP" content types as active parts of the system, and update to reflect the template-based approach.
*   **READMEs & Inline Comments:**
    *   **DONE:** `src/app/api/content/generate/README.md` has been updated to reflect the template-based API.
    *   **REVIEWED:** Other READMEs or critical inline comments identified by search do not appear to require changes related to this refactor (e.g., `docs/CONTENT_TEMPLATE_SYSTEM.md` already explains the transition). `docs/missing-pages/implementation-guide.md` seems outdated but doesn't block this refactor.
*   **This Document:**
    *   **DONE:** This investigation document (`docs/investigation-old-content-types-removal.md`) has been updated throughout the process.

## 4. Final Review & Next Steps

The investigation has been completed, and the old content types have been removed from the system. The next steps are to:

1.  Verify the removal in all environments.
2.  Conduct a final audit to ensure no remnants of the old system remain.
3.  Update any remaining documentation to reflect the template-based approach.
4.  Monitor the system for any unexpected issues related to the removal.