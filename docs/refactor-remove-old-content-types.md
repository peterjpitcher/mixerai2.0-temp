# Refactoring Plan: Removal of Old Content Types System

## 1. Introduction

This document outlines the plan to remove the deprecated `content_types` table and its associated User Interface (UI) elements, API endpoints, and backend logic from the MixerAI 2.0 application. This refactoring is necessary due to the introduction of the new Content Templates system, which supersedes the functionality previously provided by the hardcoded content types.

## 2. Assumptions

*   The new Content Template system entirely replaces the need for the `content_types` table and its direct foreign key linkages (`content_type_id`) in the `content` and `workflows` tables.
*   The `approved_content_types` field in the `brands` table is also made redundant by the new system.
*   Workflows will no longer be categorised or uniquely identified by the old `content_type_id`. Their relationship with content generation will be managed through the new Content Templates system.

## 3. Phased Plan

The removal will be executed in the following phases:

### Phase 1: Database Modifications

A single SQL migration script will be created to perform the following actions:

1.  **Drop Foreign Key Constraints:**
    *   `ALTER TABLE public.content DROP CONSTRAINT IF EXISTS content_content_type_id_fkey;`
    *   `ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_content_type_id_fkey;`
2.  **Drop Unique Constraint from `workflows` Table:**
    *   The unique constraint on `public.workflows` involving `content_type_id` (e.g., `workflows_brand_id_content_type_id_key` or similar) must be dropped. The exact name will be confirmed from the schema.
    *   Example: `ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_brand_id_content_type_id_key;`
3.  **Drop Columns from Dependent Tables:**
    *   `ALTER TABLE public.content DROP COLUMN IF EXISTS content_type_id;`
    *   `ALTER TABLE public.workflows DROP COLUMN IF EXISTS content_type_id;`
    *   `ALTER TABLE public.brands DROP COLUMN IF EXISTS approved_content_types;`
4.  **Drop Row Level Security (RLS) Policies for `content_types`:**
    *   `DROP POLICY IF EXISTS content_types_view_policy ON public.content_types;`
    *   `DROP POLICY IF EXISTS content_types_modify_policy ON public.content_types;`
    *   `DROP POLICY IF EXISTS "Admins can manage content types" ON public.content_types;` (or any other RLS policies specific to this table).
5.  **Drop Trigger for `content_types`:**
    *   `DROP TRIGGER IF EXISTS update_content_types_modtime ON public.content_types;`
6.  **Drop `content_types` Table:**
    *   `DROP TABLE IF EXISTS public.content_types;`

### Phase 2: Backend Code Changes

1.  **Delete API Route:**
    *   Delete the file `src/app/api/content-types/route.ts`.
2.  **Update Supabase Types (`src/types/supabase.ts`):**
    *   Remove the entire `content_types` interface from `Database.public.Tables`.
    *   Remove the `content_type_id` property (and its foreign key relationship object) from the `Row`, `Insert`, and `Update` interfaces for the `content` table.
    *   Remove the `content_type_id` property (and its foreign key relationship object) from the `Row`, `Insert`, and `Update` interfaces for the `workflows` table.
    *   Remove the `approved_content_types` property from the `Row`, `Insert`, and `Update` interfaces for the `brands` table.
3.  **Remove Server Fallback Logic (`server.js`):**
    *   Delete the block of code handling the `if (apiPath.startsWith('content-types'))` condition.
    *   In the fallback for `if (apiPath.startsWith('content'))`, remove the `content_type_name` field from the sample content objects.
4.  **Adapt Dependent API Endpoints:**
    *   **`src/app/api/content/route.ts` (POST handler):** Modify to no longer expect or use `content_type_id` in the request body when creating new content.
    *   **`src/app/api/content/generate/route.ts`:** Modify to no longer expect or use `contentType` (from the old system) in the request body. Generation logic should rely on template information.
    *   Manually review other API routes that might interact with `content` or `workflows` tables (e.g., workflow management APIs) to ensure no residual logic attempts to use the removed `content_type_id`.

### Phase 3: Frontend Code Changes

*(This phase requires further input to be fully finalized, as detailed in Section 4).*

1.  **Refactor `src/components/content/content-generator-form.tsx`:**
    *   Remove the `ContentType` interface.
    *   Remove `contentTypes` and `selectedContentType` from the component's state.
    *   Remove the `useEffect` hook logic responsible for fetching data from `/api/content-types`.
    *   Remove the `preselectedContentType` prop. The component should now be primarily driven by the `templateId` prop.
    *   In the `handleGenerate` function, remove all logic and `requestBody` fields related to `selectedContentType`.
    *   In the `handleSave` function, remove all logic and `requestBody` fields related to `contentTypeObj` and `content_type_id`.
2.  **Modify or Delete `src/app/dashboard/content/new/page.tsx`:**
    *   The current page reads `type` or `contentType` and `template` from URL search parameters.
    *   Logic for `type`/`contentType` (old system) must be removed.
    *   The page title generation based on `formattedContentType` must be removed or adapted.
    *   **Decision Point:**
        *   If this page is still used as an entry point when a *new Content Template* is selected (e.g., navigating to `/dashboard/content/new?template=TEMPLATE_ID`), it should be simplified to only handle `templateId`. The title could become generic (e.g., "Create Content from Template") or fetch the template name.
        *   If the new user flow *always* starts elsewhere (e.g., a template gallery that directly instantiates or links to the `ContentGeneratorForm` with a `templateId`), then this page (`src/app/dashboard/content/new/page.tsx`) and any direct navigation links pointing to it without a `templateId` should be **deleted**.
3.  **Identify and Remove/Update Other UI Elements:**
    *   A thorough search of the codebase (especially in `src/app/dashboard/` and `src/components/`) is needed to find any other UI elements (dropdowns, selection lists, table filters, navigation links) that might still reference or allow users to interact with the old content types.
    *   For example, the main content listing page (e.g., `src/app/dashboard/content/page.tsx`) might have filters based on `content_type_name`. These must be removed or adapted (e.g., to filter by the new Content Template name if applicable).
    *   Any direct navigation links for creating content based on specific old types (e.g., "New Article", "New Retailer PDP") must be removed if they don't align with the new template-driven flow.

### Phase 4: Cleanup SQL Scripts & Documentation

1.  **Update Schema and Setup Scripts:**
    *   Remove `CREATE TABLE IF NOT EXISTS content_types` statements.
    *   Remove `INSERT INTO content_types` statements.
    *   Remove references to `content_type_id` in `CREATE TABLE content` and `CREATE TABLE workflows`.
    *   Remove `approved_content_types` from `CREATE TABLE brands`.
    *   Remove the `update_content_types_modtime` trigger creation.
    *   These changes apply to files such as:
        *   `supabase-schema.sql`
        *   `migrations/archive/001_initial_schema.sql` (and similar archived schema files)
        *   `migrations/archive/001_clean_schema.sql`
        *   `docs/setup-local-db.sh` (or any other local DB setup scripts)
        *   Any active (non-archived) migration files that might reference these.
2.  **Review and Remove/Update Specific Migration Files:**
    *   Delete `migrations/archive/20250506-214012/add_approved_content_types.sql`.
    *   Review other migration files (both in `migrations/` and `migrations/archive/`) for any other direct interactions with `content_types` (e.g., altering the table, adding data) and ensure these operations are removed or updated.
3.  **Update Project Documentation:**
    *   Remove all references to the `content_types` table, its API, and its UI aspects from all project documentation files (e.g., `CONSOLIDATED_DOCUMENTATION.md`, `DOCUMENTATION.md`, API structure documents, project structure documents).

## 4. Pending Information Required for Phase 3 Finalization

To accurately finalize and execute Phase 3 (Frontend Code Changes), the following information is required:

1.  **Detailed New User Flow for Content Creation:**
    *   How do users initiate content creation in the new system?
    *   Is selection of a "Content Template" always the first step? If so, from where (e.g., a template gallery page)?
    *   What is the navigation flow after a template is selected? Does it lead to a page like `/dashboard/content/new?template=ID`, or does the content generation UI appear differently (e.g., in a modal)?
    *   Are there any scenarios where a user can create content *without* first selecting a specific Content Template?
2.  **Identification of Other UI Dependencies:**
    *   Are there any other known pages, tables, filters, dropdowns, or navigation links within the application that currently allow users to select, filter by, or navigate based on the old "content types" (e.g., "Article," "Retailer PDP")?

## 5. Next Steps (Post-Removal)

Once the old `content_types` system is successfully removed, the next logical steps would involve fully implementing and refining the new Content Templates system. This includes, but is not limited to:

*   Establishing the database relationship between `content_templates` and `workflows` (e.g., adding a `workflow_id` to the `content_templates` table).
*   Redefining unique constraints on the `workflows` table if necessary (e.g., `UNIQUE(brand_id, name)`).
*   Building any new UI required for managing Content Templates and their association with Workflows.

These are considered subsequent tasks unless specified to be included in the current refactoring effort. 