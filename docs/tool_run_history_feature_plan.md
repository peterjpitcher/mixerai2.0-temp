# Tool Run History Feature Plan

**Status: Implemented**

This document outlines the plan to implement a feature that records and displays the history of runs for various AI-powered tools within the MixerAI application.

## 1. Database Schema (`tool_run_history` table) - DONE

A new table has been created in the database to store the history of tool executions.

*   **Table Name:** `tool_run_history`
*   **Migration Script:** `migrations/0001_create_tool_run_history.sql` (or a similar timestamped name)
    *   The script includes the `tool_run_status` enum, the `tool_run_history` table with appropriate columns (`id`, `user_id` ON DELETE SET NULL, `tool_name`, `brand_id` ON DELETE SET NULL, `inputs`, `outputs`, `run_at`, `status`, `error_message`), indexes, and RLS policies.
    *   RLS Policies:
        *   "Users can view their own tool run history or admins can view all": Allows users to select their own records, and users with the 'admin' role to select any record.
        *   "Users can insert their own tool run history": Allows users to insert records where `user_id` matches their `auth.uid()`.

*   **Record Limiting:** (Implemented as per original plan - SQL logic documented for a periodic cleanup script/function)
    *   A maximum of 15,000 history records will be maintained *per tool*.
    *   This will be managed by a periodic cleanup script (e.g., a daily Supabase Edge Function or an external cron job).
    *   SQL logic for cleanup is documented below and can be used in the chosen mechanism.

*   **SQL Logic for Cleanup (to be used in a Supabase Edge Function or cron job):**
    ```sql
    -- This script would ideally be run for each tool_name.
    -- Example for 'alt_text_generator':
    DO $$
    DECLARE
        max_records_per_tool CONSTANT INT := 15000;
        tool_specific_name CONSTANT TEXT := 'alt_text_generator'; -- This would be a parameter in a function
        current_count INT;
        records_to_delete INT;
    BEGIN
        SELECT COUNT(*) INTO current_count FROM tool_run_history WHERE tool_name = tool_specific_name;

        IF current_count > max_records_per_tool THEN
            records_to_delete := current_count - max_records_per_tool;

            DELETE FROM tool_run_history
            WHERE id IN (
                SELECT id
                FROM tool_run_history
                WHERE tool_name = tool_specific_name
                ORDER BY run_at ASC
                LIMIT records_to_delete
            );
            RAISE NOTICE 'Cleaned % old records for tool: %', records_to_delete, tool_specific_name;
        ELSE
            RAISE NOTICE 'No cleanup needed for tool: %. Current records: %', tool_specific_name, current_count;
        END IF;
    END$$;

    -- The above DO block would be repeated or parameterized for 'metadata_generator' and 'content_transcreator'.
    ```

## 2. Backend - API Modifications (Existing Tool Endpoints) - DONE

The POST handlers for the existing tool API routes have been updated to log each run.

*   **Affected Routes (Modified):**
    *   Alt Text Generator: `src/app/api/tools/alt-text-generator/route.ts`
    *   Metadata Generator: `src/app/api/tools/metadata-generator/route.ts`
    *   Content Trans-creator: `src/app/api/tools/content-transcreator/route.ts` (Rate limiting also added)
*   **Logic Implemented for each route:**
    1.  After the core tool logic.
    2.  `user_id` retrieved from the authenticated session.
    3.  `inputs` and `outputs` JSON objects constructed (tool-specific).
    4.  `status` ('success' or 'failure') determined.
    5.  `error_message` captured if failed.
    6.  Supabase admin client used to `insert` into `tool_run_history` within a `finally` block.

### Tool-Specific Input/Output Structures for History Logging: (Implemented as per original plan)

**A. Alt Text Generator (`tool_name: 'alt_text_generator'`)**
*   **History `inputs`:** `{ "imageUrls": [...], "language": "..." }`
*   **History `outputs`:** `{ "results": [{ "imageUrl": "...", "altText": "..." / "error": "..." }] }`
*   **`brand_id`:** `NULL`

**B. Metadata Generator (`tool_name: 'metadata_generator'`)**
*   **History `inputs`:** `{ "urls": [...], "language": "..." }`
*   **History `outputs`:** `{ "results": [{ "url": "...", "metaTitle": "...", etc. / "error": "..." }] }`
*   **`brand_id`:** `NULL`

**C. Content Trans-creator (`tool_name: 'content_transcreator'`)**
*   **History `inputs`:** `{ "content": "...", "sourceLanguage": "...", "brand_id": "..." }`
*   **History `outputs` (success):** `{ "transCreatedContent": "...", "targetLanguage": "...", "targetCountry": "..." }`
*   **History `outputs` (failure):** `{ "error": "..." }`
*   **`brand_id`:** Populated from request.

## 3. Backend - API for Fetching History - DONE

New API routes have been created to allow the frontend to fetch history records.

*   **List API Route:** `src/app/api/me/tool-run-history/route.ts`
    *   **Method:** `GET`
    *   **Request:** Optional query parameter `tool_name` (string).
    *   **Functionality:** Authenticated. Fetches history for the logged-in user (or all for admin via RLS), optionally filtered by `tool_name`, ordered by `run_at DESC`, limit 50.

*   **Detail API Route:** `src/app/api/me/tool-run-history/[historyId]/route.ts`
    *   **Method:** `GET`
    *   **Request:** Dynamic path parameter `historyId` (string).
    *   **Functionality:** Authenticated. Fetches a single history item by its `id`. RLS ensures user can only fetch their own records unless they are an admin.

## 4. Frontend - UI Updates - DONE

Each tool's page now displays a summary of its run history, linking to a detailed view.

*   **Affected Pages (Summary List Added):**
    *   Alt Text Generator: `src/app/dashboard/tools/alt-text-generator/page.tsx`
    *   Metadata Generator: `src/app/dashboard/tools/metadata-generator/page.tsx`
    *   Content Trans-creator: `src/app/dashboard/tools/content-transcreator/page.tsx`
*   **New Page (Detailed View Created):**
    *   `src/app/dashboard/tools/history/[historyId]/page.tsx`
*   **UI Elements & Logic Implemented:**
    1.  **Summary List (on each tool page):**
        *   "Run History" section added.
        *   Fetches history from `/api/me/tool-run-history?tool_name=<specific_tool>`.
        *   Displays loading/empty/error states.
        *   Each item shows Run Date, Status (Badge), and a "View Details" button linking to the detail page.
    2.  **Detailed History Page (`/dashboard/tools/history/[historyId]`):**
        *   Fetches full details from `/api/me/tool-run-history/[historyId]`.
        *   Displays Tool Name, Run Date, Status, User ID, Brand ID (if any), Inputs (collapsible JSON viewer), Outputs (collapsible JSON viewer), and Error Message (if any).
        *   Includes breadcrumbs and a back button.

## 5. Documentation Updates - In Progress

*   This document (`docs/tool_run_history_feature_plan.md`) **is now updated.**
*   **TODO:** Update `DOCUMENTATION.md` with a section on "Tool Run History".
*   **TODO:** Update the `/help` section of the application with information about the new tool run history feature.

## Implementation Order (Actual)

1.  **DONE:** Applied database migration for `tool_run_history` (including RLS for user ownership and admin access).
2.  **DONE:** Implemented backend logging for Alt Text Generator, Metadata Generator, and Content Trans-creator (including rate limiting for Content Trans-creator).
3.  **DONE:** Created API route `src/app/api/me/tool-run-history/route.ts` (GET) to list history.
4.  **DONE:** Created API route `src/app/api/me/tool-run-history/[historyId]/route.ts` (GET) to fetch single history item.
5.  **DONE:** Added "Run History" summary section to `AltTextGeneratorPage`.
6.  **DONE:** Added "Run History" summary section to `MetadataGeneratorPage`.
7.  **DONE:** Added "Run History" summary section to `ContentTransCreatorPage`.
8.  **DONE:** Created the dedicated history detail page `src/app/dashboard/tools/history/[historyId]/page.tsx`.
9.  **DONE:** Updated this feature plan document.
10. **NEXT:** Update `DOCUMENTATION.md`.
11. **LATER:** Update user-facing help in `/content/help-wiki/`. 