# New Content Approval Workflow - MVP Implementation Plan

Date: 2024-07-27

## 1. Goal

Implement an MVP of a content approval workflow system where content items are routed through a predefined sequence of steps. This plan focuses on content progressing through *existing* workflows. Workflow creation UI/API **will not be changed** for this MVP; it will continue to use `workflows.steps JSONB` for step definitions and owner assignments within that JSON.

## 2. Core Requirements (Summary from Brief, adapted to Live Schema)

*   **Workflow Configuration (Existing):** Workflows consist of ordered, mandatory steps defined in `workflows.steps JSONB`. Each step object within the JSONB contains its name, (likely a numeric `id`), and its assigned owner(s) (e.g., an `assignees` array with user IDs/emails).
    *   **`workflows.template_id`:** Added `template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL` to the `workflows` table, to be populated by existing workflow creation/editing UI if/when that UI is updated. For this MVP, backend logic may not strictly enforce its presence for workflow association if workflows can be generic.
*   **Content Progression:** Content assigned to a workflow moves sequentially based on `content.current_step` (integer index/ID referencing a step in `workflows.steps JSONB`). Only one step is active.
*   **Action Statuses:** Step actions result in a status (e.g., 'Completed', 'Rejected') tracked in the new `content_versions` table.
*   **Reviewer Actions:** Step owner (identified from `workflows.steps JSONB`) can approve/reject. Rejection requires feedback.
*   **Rejection Handling:** Rejected content (`content.status = 'rejected'`) goes to `brand_admin_id`. Admin can restart workflow (sets `content.current_step` to 0, `content.status` to `pending_review`).
*   **Versioning:** New `content_version` (snapshot of `content.content_data`) created on each approval or rejection.
*   **Overall Content Status:** `content.status` reflects lifecycle: `pending_review` (initial, restarted, in progress), `approved` (all steps complete), `rejected` (a step is rejected).

## 3. Implementation Plan (Revised based on Live Schema Discovery)

### I. Database Schema Changes (in `migrations/consolidated_migrations.sql`)

*   **DONE (2024-07-27):**
    1.  **`brands` Table:** Added `brand_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL`.
    2.  **`workflows` Table (Existing Structure Utilized):
        *   No changes to `steps JSONB`. Owners defined within this JSON.
        *   Added `template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL`.
    3.  **`workflow_steps` SQL Table (Defining Steps):
        *   **NOT CREATED.** Step definitions are managed within `workflows.steps JSONB`.
    4.  **`workflow_user_assignments` SQL Table:
        *   **CONFIRMED ABSENT.** This table does not exist in the live schema. Step owner information is within `workflows.steps JSONB`.
    5.  **`content` Table:** `current_step INTEGER DEFAULT 0` remains (references index/ID in `workflows.steps JSONB`).
    6.  **`content_versions` Table (New Table):** Created with `workflow_step_identifier TEXT`, `step_name TEXT`, `version_number INT`, `content_json JSONB`, `action_status TEXT`, `feedback TEXT`, `reviewer_id UUID`, `created_at TIMESTAMP`.

### II. API Endpoint Implementation

*   **DONE (2024-07-27):**
    1.  **Content Workflow Actions API (`src/app/api/content/[id]/workflow-action/route.ts` - POST):** Created. Handles `approve` and `reject` actions, verifies step owner, creates `content_versions`, and updates `content` status/step.
    2.  **Brand Admin Workflow Restart API (`src/app/api/content/[id]/restart-workflow/route.ts` - POST):** Created. Allows authorized brand admin to restart a rejected workflow.
    3.  **API for "My Tasks" (`src/app/api/me/tasks/route.ts` - GET):** Created.
    4.  **API for Brand Admin Rejected Content (`src/app/api/brands/[id]/rejected-content/route.ts` - GET):** Created.
    5.  **API for Content Versions (`src/app/api/content/[id]/versions/route.ts` - GET):** Created.

### III. Frontend UI (Modifications & New Views)

*   **DONE (2024-07-27):**
    1.  **Content Detail Page (`src/app/dashboard/content/[id]/page.tsx`) & `ContentApprovalWorkflow` component (`src/components/content/content-approval-workflow.tsx`):
        *   Updated to fetch content versions and use new API endpoints.
        *   Props refined for `ContentApprovalWorkflow` to pass current step object, owner status, versions, and action callback.
        *   `ContentApprovalWorkflow` now handles API calls for approve/reject actions.
    2.  **"My Tasks" View (`src/app/dashboard/my-tasks/page.tsx`):
        *   Page created, fetches tasks from its API, and displays them.
        *   Link added to main navigation.
    3.  **Brand Admin Rejected Content View (`src/components/dashboard/brand/rejected-content-list.tsx` & integration in `src/app/dashboard/brands/[id]/page.tsx`):
        *   Component created to fetch and list rejected content for a brand.
        *   Integrated as a new tab on the Brand Detail page, conditionally visible to the brand admin.

### IV. Out of Scope for this MVP

*   Changes to UI/API for creating/editing `workflows` (these continue to manage `steps JSONB` and `workflow_user_assignments`, or more likely, assignee info directly within the step JSON objects).
*   Real-time notifications.
*   Editing content *during* an active workflow (focus is on approving/rejecting the version at that step).

## 4. Open Questions/Considerations during Development

*   Clarify if `workflows.template_id` should be added to the `workflows` table. **Decision:** Added.
*   Exact structure of `assignees` within `workflows.steps JSONB` (e.g., array of user IDs or emails). **Assumption for API:** `getStepOwnerId` in workflow-action API attempts to use `assignees[0].id` or falls back to `workflow_user_assignments`. This helper needs to be robust based on actual JSON structure.
*   Generation of `version_number` in `content_versions` (e.g., `MAX(version_number) + 1` for the content_id). **Implemented:** `getNextVersionNumber` helper created.
*   Relationship between `content.body`/`meta_*` fields and `content.content_data` if `content_data` is the primary source for versioning. (MVP: `content_json` in versions snapshots `content_data`).
*   If `steps` in `workflows.steps JSONB` have unique numeric `id`s, these should be used for `content.current_step` and `content_versions.workflow_step_identifier` instead of array index, if more robust. **API Implementation:** `workflow_step_identifier` uses `currentStepObject.id || currentStepIndex`.