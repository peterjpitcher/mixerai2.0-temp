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
    *   **Migration History:** Investigate migration tool history (e.g., Prisma/Migrations, Flyway, custom scripts) for any past migrations that `CREATE` or `ALTER` `content_types` table or the `content.content_type_id` column to understand schema evolution and identify migrations to potentially roll back or mark as no-ops.
*   **Data Integrity & Cleanup (If `content_types` table/column is to be removed):**
    *   Ensure all existing content items have their `template_id` correctly set (potentially mapping old `content_type_id` values to corresponding new `template_id`s if necessary and feasible).
    *   Implement a one-off data migration job to safely archive (if needed for historical reference) and then drop the `content_types` table and the `content.content_type_id` column from all relevant database environments (development, staging, production).
*   **Seeding & Test Fixtures:**
    *   Update `scripts/clean-database.sql` to stop creating or populating the `content_types` table.
    *   Update `scripts/create-sample-brands.sql` to use `template_id` (linking to valid `content_templates`) for sample content instead of `content_type_id`.
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
    *   Delete page folders: `src/app/dashboard/content/article/`, `src/app/dashboard/content/ownedpdp/`, `src/app/dashboard/content/retailerpdp/`.
*   **Navigation & Links:**
    *   Update navigation in `src/app/dashboard/page.tsx` and any shared navigation components (e.g., as described in `docs/NAVIGATION_FIX_IMPLEMENTATION.md`) to remove links to the deleted pages.
*   **UI Data Display & Interactions:**
    *   Modify `src/app/dashboard/content/[id]/page.tsx` to fetch and display type information based on `content.template_id` (e.g., by fetching the template name) instead of using mock `content.type`. Update `ContentApprovalWorkflow` props if necessary.
    *   Update mock data and any related logic in `src/components/dashboard/analytics-overview.tsx` to use template-based information.
    *   Audit any remaining UI select controls, filter panels, or tables that might still hardcode or allow filtering/selection based on the old three type-strings and update them.
*   **TypeScript Interfaces & Props:**
    *   Remove obsolete props like `contentType: "Article"` (or similar for "Owned PDP", "Retailer PDP") from component interfaces and prop types throughout the frontend codebase.
*   **Mock Data in Tests:**
    *   Beyond specific component mocks, audit all Jest/React Testing Library (and other testing framework) mock data setups for references to old content types and update them.
*   **Storybook & Styleguides:**
    *   If a Storybook, Chromatic, or similar UI component development/testing environment is used, remove any stories or visual regression tests associated with the deleted pages or components that specifically showcased the old content types.

### 3.4. Routing, Redirects & SEO
*   **Redirect Configuration:**
    *   Update redirects in `next.config.js`. For example, redirects like `source: '/dashboard/content', destination: '/dashboard/content/article'` should be re-evaluated to point to a sensible default (e.g., the main content list `/dashboard/content/page.tsx`) or removed if no longer logical.
    *   Update `scripts/test-redirects.js` to reflect changes in `next.config.js` and ensure CI tests pass.
*   **Search Engine Optimization:**
    *   Regenerate `sitemap.xml` (and update any Next-Sitemap configurations) to remove URLs of the deleted pages.
    *   Update `robots.txt` if it specifically referenced paths for these old content type pages.
    *   Remove any page-specific `<link rel="canonical">` tags or `<meta name="robots">` configurations related to the old content type pages from layouts or head components.

### 3.5. Testing & CI/CD
*   **End-to-End (E2E) Tests:**
    *   Audit E2E test suites (e.g., Cypress, Playwright) for any tests that navigate to, interact with, or assert content on the deleted pages (`/dashboard/content/article`, `/ownedpdp`, `/retailerpdp`) or click links leading to them.
*   **Integration Tests:**