# Feature Requests and Upcoming Changes Summary (2024-05-27)

This document outlines a series of requested features and changes for the MixerAI application, along with discovery notes and implementation plans.

## 1. Duplicate Workflow Functionality

*   **Location:** `/dashboard/workflows` page.
*   **Trigger:** A new "Duplicate" button on each workflow card.
*   **Action (Plan):**
    *   **API Endpoint:** Create `POST /api/workflows/[id]/duplicate`.
        *   Fetches original workflow by `id`.
        *   Creates a new workflow object: `name` ("Copy of ..."), `brand_id` (null), `steps` (deep copy), `status` ('active'), `template_id` (copied), `created_by` (current user), new timestamps.
        *   Inserts into `workflows` table.
        *   Returns new workflow data (especially ID).
    *   **Frontend (`src/app/dashboard/workflows/page.tsx`):**
        *   Add "Duplicate" button to workflow cards.
        *   Handler function: (Optional confirm modal) -> Call API -> Redirect to `/dashboard/workflows/[newWorkflowId]/edit`.
    *   **Type Update (`src/types/models.ts`):** Add `status?: 'active' | 'draft' | 'archived' | string;` to `Workflow` interface.
    *   **Key Logic:** Ensure `steps` are deep-copied correctly. Robust error handling.

## 2. Validate Navigation Permissions

*   **Source of Truth:** `docs/navigation_permissions_matrix.md`.
*   **Goal:** Verify implemented logic (UI navigation, API authorization, RLS, page-level checks) aligns with the matrix. Identify discrepancies.
*   **Exclusions:** No manual testing with user accounts or direct code changes during this validation. Output is a report of findings.
*   **Discovery Findings (Initial):**
    *   `docs/navigation_permissions_matrix.md` is comprehensive and includes a self-assessment of an implementation plan, with many items marked "DONE".
    *   Key files for review confirmed:
        *   `src/components/layout/unified-navigation.tsx`
        *   RLS policies primarily in `supabase-schema.sql`, with contributions from other migration files.
    *   Initial check of `GET /api/content-templates/route.ts` shows its permissions (allows 'admin' and 'editor') differ from the matrix which states "Content Templates: Global Admins only". This highlights the need for systematic review.
*   **Review Process (Plan):**
    1.  **Understand Role Definitions in Code:** Examine `unified-navigation.tsx` and auth context/hooks to confirm how matrix roles (`Global Admin`, `Brand Admin (Non-Global)`, etc.) are mapped to checkable boolean conditions from `user_metadata.role` and brand permissions.
    2.  **Validate `UnifiedNavigation.tsx`:** For each nav item in the matrix, compare its visibility logic in the code against matrix specifications. Document discrepancies.
    3.  **Validate API Endpoint Authorization:** For API endpoints in the matrix (e.g., `/api/content-templates`, `/api/brands`), review `route.ts` handlers (`GET`, `POST`, `PUT`, `DELETE`) for role checks. Compare with matrix. Document discrepancies.
    4.  **Validate RLS Policies:** Review RLS in `supabase-schema.sql` (and others) for `brands`, `content_templates`, `workflows`, `content`, `user_brand_permissions`. Assess if policies match matrix intent for each role. Document discrepancies.
    5.  **Validate Page-Level & Component-Level Authorization (Client-Side):** For pages in matrix Phase 3 (e.g., `BrandEditPage`), review client-side permission checks and conditional UI rendering. Compare with matrix. Document discrepancies.
    6.  **Consolidate Findings:** Compile a list of all identified discrepancies.

## 3. UI/UX Unification and Enhancements for Brand Creation/Editing

*   **Target Pages:** `src/app/dashboard/brands/new/page.tsx` and `src/app/dashboard/brands/[id]/edit/page.tsx`.
*   **Overall Goal:** Make the UI/UX of the brand edit page (`edit/page.tsx`) consistent with the brand creation page (`new/page.tsx`), incorporating specific changes to both.
*   **Discovery Findings:**
    *   **`new/page.tsx`:** Handles `additional_website_urls` (array of objects). Allows managing Brand Admins (search, add, remove). No current UI for Master Claim Brand selection. Has `handleGenerateBrandIdentity` function.
    *   **`edit/page.tsx`:** Handles `additional_website_urls` similarly. Fetches/stores `master_claim_brands` and has `formData.master_claim_brand_id` for selection (UI for this to be model for `new/page.tsx`). Fetches `brand.admins` into `displayedAdmins`; read-only display UI needs to be ensured. Has `handleGenerateBrandIdentity` function.
*   **Implementation Plan:**
    *   **A. Enhancements for `new/page.tsx` (Create Brand Page):**
        *   **Product Claims Brand Association (Recommended Approach):**
            *   Add UI (combo box, data fetching from `/api/master-claim-brands`, state management for selection) to allow selecting a "Master Claim Brand". Model this UI based on the existing logic in `edit/page.tsx`.
            *   This selection is optional.
            *   **Linking Logic (Backend):** `POST /api/brands` should be updated to accept `master_claim_brand_id` in its payload and save it to `brands.master_claim_brand_id`.
            *   (Reminder: `master_claim_brands.mixerai_brand_id` column is to be removed/deprecated as per prior recommendation. No update to `master_claim_brands` table needed here).
        *   **Conditional 'Generate Brand Identity' Button:**
            *   Modify the `handleGenerateBrandIdentity` function and the button's `disabled` prop. Enable only if `formData.additional_website_urls.some(url => url.value.trim() !== '')` is true.
    *   **B. Updates for `edit/page.tsx` (Edit Brand Page):**
        *   **UI Unification:** Refactor JSX layout, input fields, and button placements to visually match `new/page.tsx` (e.g., remove Tabs if present and not on `new/page.tsx`). Ensure data fetching for existing brand details is preserved.
        *   **Product Claims Brand Association (Recommended Approach):** Ensure the existing combo box for selecting/editing the "Master Claim Brand" is present and functional. `PUT /api/brands/[id]` already handles `master_claim_brand_id`.
        *   **Brand Admins Display (Read-Only):**
            *   Remove any UI for adding/searching/removing brand admins.
            *   Ensure existing brand administrators (`displayedAdmins` state, sourced from `brand.admins` which includes `full_name` and `email`) are displayed clearly in a read-only format (e.g., a list or badges showing Name and Email). Data is fetched via `GET /api/brands/[id]`. The component `src/app/dashboard/users/page.tsx` is the correct place for managing these.
        *   **Conditional 'Generate Brand Identity' Button:**
            *   Implement the same conditional logic for the "Generate Brand Identity" button as on the `new/page.tsx`.
    *   **General for Both Pages:**
        *   Ensure consistent styling and component usage (e.g., `Button`, `Input`, `Card`, `Label` from `@/components/ui/...`).

## 4. My Tasks Page - Content Link Behaviour

*   **Location:** `src/app/dashboard/my-tasks/page.tsx`.
*   **Change:** When a user clicks on the title of a content item listed on this page, they will be navigated directly to the edit page for that content (`/dashboard/content/[content_id]/edit`), rather than its view/details page.
*   **Discovery Findings:**
    *   The page fetches tasks from `/api/me/tasks`.
    *   Content titles are currently rendered as: `<Link href={`/dashboard/content/${task.content_id}`} ...>` which links to the view page.
    *   A separate "Edit Content" button correctly links to `/dashboard/content/${task.content_id}/edit`.
*   **Implementation Plan:**
    1.  **Modify Link:** In `src/app/dashboard/my-tasks/page.tsx`, change the `href` for the content title link from ``/dashboard/content/${task.content_id}`` to ``/dashboard/content/${task.content_id}/edit``.

## 5. Content Page - View Approved Content at Each Step in History

*   **Location:** Content view/edit page, specifically within the history display, likely in `src/components/content/content-approval-workflow.tsx` (used by `src/app/dashboard/content/[id]/edit/page.tsx`).
*   **Enhancement:** In the "Content History and Feedback" section, for each recorded step from `content_versions`, users should be able to see the version of the content that was approved/processed at that specific step.
*   **Discovery Findings:**
    *   The API `/api/content/[id]/versions` should already return `content_json` in each version object due to `select('*')`.
    *   `src/app/dashboard/content/[id]/edit/page.tsx` fetches versions and passes them to `<ContentApprovalWorkflow versions={versions} ... />`.
    *   The `ContentVersion` interface defined locally within `ContentApprovalWorkflow.tsx` (and also in `edit/page.tsx`) currently *lacks* the `content_json` field. This needs to be added.
    *   The rendering logic in `ContentApprovalWorkflow.tsx` maps over `relevantVersions` to display feedback and status but does not yet show `content_json.generatedOutputs`.
*   **Implementation Plan:**
    1.  **Update `ContentVersion` Type:** In `src/components/content/content-approval-workflow.tsx` (and `src/app/dashboard/content/[id]/edit/page.tsx` if its local type is used independently), add `content_json?: { generatedOutputs?: Record<string, string>; } | null;` to the `ContentVersion` interface.
    2.  **Modify Rendering in `ContentApprovalWorkflow.tsx`:**
        *   Inside the `.map(v => ...)` loop that renders each version's history item:
            *   After displaying feedback, add a new section to check for `v.content_json?.generatedOutputs`.
            *   If present, iterate `Object.entries(v.content_json.generatedOutputs)`. For each `[fieldId, htmlContent]`:
                *   Skip known non-content keys (e.g., 'userId', 'success').
                *   Render the `htmlContent` using `<div dangerouslySetInnerHTML={{ __html: htmlContent }} />` (likely styled with `prose prose-xs`).
                *   (Optional Enhancement): If the main `template` object (defining output field names) can be passed down to `ContentApprovalWorkflow`, display the output field's name alongside its content for better context.

## 6. Duplicate Content Template Functionality

*   **Location:** `src/app/dashboard/templates/page.tsx`.
*   **Trigger:** A new "Duplicate" button on each content template card.
*   **Action:** Create a copy of the content template and redirect to its edit page.
*   **Discovery Findings:**
    *   `templates/page.tsx` lists templates in cards. Has delete functionality. Local `Template` type needs `icon` and `brand_id` fields added.
    *   `POST /api/content-templates` API route creates new templates. It expects `name`, `fields` (mandatory), `description`, `icon`. It sets `created_by`. It does *not* currently accept `brand_id` in the payload for insertion; this needs to be added to the API's `insert` call.
*   **Implementation Plan:**
    1.  **Update `Template` type in `templates/page.tsx`:** Add `icon?: string | null;` and `brand_id?: string | null;` to the local `Template` interface.
    2.  **Modify `POST /api/content-templates` (`route.ts`):**
        *   In the `.insert({...})` call, add `brand_id: data.brand_id || null` to the payload.
    3.  **Modify `templates/page.tsx`:**
        *   **Add "Duplicate" Button:** To each template card footer, add a "Duplicate" button.
        *   **Implement `handleDuplicateTemplate(templateToDuplicate: Template)` function:**
            *   Construct `newTemplateData = { name: "Copy of " + templateToDuplicate.name, description: templateToDuplicate.description, icon: templateToDuplicate.icon, fields: JSON.parse(JSON.stringify(templateToDuplicate.fields)), brand_id: templateToDuplicate.brand_id }`. (Deep copy fields).
            *   Call `fetch('/api/content-templates', { method: 'POST', body: JSON.stringify(newTemplateData), headers: {'Content-Type': 'application/json'} })`.
            *   On success (API should return the new template object with its ID):
                *   `toast.success(...)`
                *   `router.push(\`/dashboard/templates/${newlyCreatedTemplate.id}/edit\`)` (Assuming edit page is at `/edit`. Confirm this path.)
            *   On error: `toast.error(...)`.

## 7. Workflow Creation/Editing - Filter Content Templates Dropdown

*   **Location:** `src/app/dashboard/workflows/new/page.tsx` and `src/app/dashboard/workflows/[id]/edit/page.tsx`.
*   **Change:** The dropdown menu for selecting a "Content Template" will be filtered to show only templates not already associated with an existing workflow for the *currently selected brand*. The current workflow's template (if editing) should always be available.
*   **Discovery Findings:**
    *   Workflow pages fetch brands from `/api/brands` and all content templates from `/api/content-templates`.
    *   The API `GET /api/workflows` already supports filtering by `brand_id` (`?brand_id=xxx`), which is ideal for fetching existing workflows for the selected brand.
    *   No current client-side logic exists on workflow pages to fetch these brand-specific workflows or filter the template dropdown.
*   **Implementation Plan:**
    *   **A. `src/app/dashboard/workflows/new/page.tsx` (New Workflow Page):**
        1.  **State for Brand Workflows:** Add `const [brandWorkflows, setBrandWorkflows] = useState<WorkflowSummary[]>([]);` (Define `WorkflowSummary` with at least `template_id`).
        2.  **Fetch Brand Workflows:** In an effect hook reacting to `workflow.brand_id` changes: if `brand_id` is set, fetch `GET /api/workflows?brand_id=${workflow.brand_id}` and populate `brandWorkflows`.
        3.  **Memoize `availableContentTemplates`:** Filter the main `contentTemplates` list. Exclude templates whose IDs are in `brandWorkflows.map(wf => wf.template_id)`.
        4.  **Update Dropdown:** Use `availableContentTemplates` to populate the template `<Select>`.
    *   **B. `src/app/dashboard/workflows/[id]/edit/page.tsx` (Edit Workflow Page):**
        1.  **State for Other Brand Workflows:** Add `const [otherBrandWorkflows, setOtherBrandWorkflows] = useState<WorkflowSummary[]>([]);`.
        2.  **Fetch Other Brand Workflows:** After the current workflow's data (including its `brand_id`) is loaded, fetch `GET /api/workflows?brand_id=${currentWorkflow.brand_id}`. Filter this list to exclude the current workflow being edited (`wf.id !== params.id`). Populate `otherBrandWorkflows`.
        3.  **Memoize `availableContentTemplates`:** Filter `contentTemplates`. Exclude templates whose IDs are in `otherBrandWorkflows.map(wf => wf.template_id)`. *Always include* the `currentWorkflow.template_id` in the available list, even if it appears in `otherBrandWorkflows` (though this shouldn't happen if data is consistent).
        4.  **Update Dropdown:** Use `availableContentTemplates` for the template `<Select>`. 