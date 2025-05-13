# May 13, 2025: Feature Updates & Fixes Log

This document tracks the planned changes and fixes based on user feedback provided on May 13, 2025.

## I. Workflow Page Issues & Enhancements

### 1. Workflow Detail Page (`/dashboard/workflows/[id]`)
    - **Status**: DONE
    - **UI Tweak**: Moved the "Content Template" display to be on the same line as the "Brand" in the "Workflow Details" card for a tidier UI.

### 2. Workflow New (`/dashboard/workflows/new`) and Edit (`/dashboard/workflows/[id]/edit`) Pages
    - **Status**: DONE
    - **Description Field**: Manual workflow description field removed from edit page (`src/app/dashboard/workflows/[id]/edit/page.tsx`). (Already done for new page).
    - **Step Editor UI** (Applied to both new and edit pages):
        - **Role Cards**:
            - Placement: Role cards are now displayed *below* the "Step Name" input.
            - Title: Redundant "Role" label within `RoleSelectionCards` component removed; primary label for section retained.
        - **"This step is optional" Switch**:
            - Label and descriptor text updated to: "This step is optional" with "Users will be able to select whether to execute on that step based on individual content need."
            - Logic for `approvalRequired` is `!isChecked`.
    - **AI-Generated Step Description Prompt**:
        - **Status**: DONE
        - Placeholder prompt in `/api/ai/generate-step-description` updated to be more instructional for the user role.
    - **Workflow Save Error & Database Migration**:
        - **Status**: DONE (Migration provided, frontend linter errors should resolve after DB update)
        - **Error**: 500 Internal Server Error and linter errors (`column 'description' does not exist on 'workflows'`) addressed by providing SQL migration script.
        - **Action**: SQL migration script `migrations/add_workflow_description_column.sql` created to add `description TEXT NULL` to the `workflows` table.

## II. AI Logic Implementation (Placeholder -> Basic Structure)

- **Status**: DONE
- For each of the following API endpoints, the simple string concatenation was replaced with a basic structure for calling an AI service (mock `callOpenAI` function) and a more detailed prompt.

1.  **`/api/ai/generate-workflow-description/route.ts`**
2.  **`/api/ai/generate-step-description/route.ts`**
3.  **`/api/ai/generate-template-description/route.ts`**

## III. Database Migrations

- **Status**: DONE (Files created)
1.  **`workflows` table**: `migrations/add_workflow_description_column.sql` created (Add `description TEXT NULL`).
2.  **`content_templates` table**: `migrations/add_template_description_column.sql` created (Add `description TEXT NULL`).

## IV. Brand New/Edit Page Issues (`/dashboard/brands/new`, `/dashboard/brands/[id]/edit`)

- **Status**: In Progress (New page was mostly done, applying to Edit page now)
1.  **Country/Language Selectors**: 
    - **New Page**: `className="max-h-[300px]"` applied to `SelectContent`.
    - **Edit Page**: `className="max-h-[300px]"` applied to `SelectContent`.
2.  **Brand Colour Placement**:
    - **New Page**: Brand colour selection UI moved from "Basic Details" tab to the "Brand Identity" tab (right-hand preview column).
    - **Edit Page**: Brand colour selection UI moved from "Basic Details" tab to the "Brand Identity" tab (right-hand preview column).
3.  **Multiple Website URLs**:
    - **New Page**: Implemented a system with a single input field and an "Add URL" button to manage a list of additional URLs. These are used for generation but not saved directly to a separate field in the `brands` table.
    - **Edit Page**: Implemented the same system (single input field + "Add URL" button) for managing `additional_website_urls`. These are used for generation.
4.  **Content Vetting Agencies UI**:
    - **New Page**: Changed from `Textarea` to a list of predefined agencies with checkboxes and an input field for custom agencies. Stored as an array in `formData`, joined to comma-separated string on save.
    - **Edit Page**: Changed from `Textarea` to the same checkbox/custom input system. Fetched comma-separated string is parsed into an array for `formData`, and joined back on save.

## V. General Review

- **Status**: Pending completion of all items.
- A thorough review of all previously requested changes will be conducted once all items are addressed.

## VI. Previously Completed Items (Summary from last interaction)

*   **Templates Page (`/dashboard/templates`)**:
    *   Full description on cards (line-clamp removed).
    *   Date format: MMMM d yyyy.
    *   Usage count added (API and UI).
*   **Template Edit Page / Field Designer (`/dashboard/templates/[id]`, `src/components/template/field-designer.tsx`)**:
    *   AI Template Description (setup for AI generation, pending DB schema update for `content_templates.description`).
    *   FieldDesigner output field modal: "Image" type added, AI autocomplete & Required UI removed, Field Options tab hidden, Brand context consolidated, input field placeholders listed.
*   **Users Page (`/dashboard/users`)**: "Joined" column changed to "Last Login".
*   **Account Page (`/dashboard/account`)**: Avatar change button removed. "Random line" issue noted (requires inspection if persists).

---
*Document End* 