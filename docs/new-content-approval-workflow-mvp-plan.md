# New Content Approval Workflow - MVP Implementation Plan

Date: 2024-07-26

## 1. Goal

Implement an MVP of a content approval workflow system where content items are routed through a predefined sequence of steps. This plan focuses on content progressing through *existing* workflows. Workflow creation UI/API **will not be changed** for this MVP; it will continue to use `workflows.steps JSONB` for step definitions and `workflow_user_assignments` for linking users to steps.

## 2. Core Requirements (Summary from Brief)

*   **Workflow Configuration (Existing):** Workflows (linked to a `content_template`) consist of ordered, mandatory steps defined in `workflows.steps JSONB`. Each step within the JSONB has a name (and likely a numeric `id`). Owners are linked via `workflow_user_assignments` using the workflow ID and the step's numeric ID/index.
*   **Content Progression:** Content assigned to a workflow moves sequentially based on `content.current_step` (integer index/ID). Only one step is active.
*   **Action Statuses:** Step actions result in a status (e.g., 'Completed', 'Rejected') tracked in the new `content_versions` table.
*   **Reviewer Actions:** Step owner can approve/reject. Rejection requires feedback.
*   **Rejection Handling:** Rejected content (`content.status = 'rejected'`) goes to `brand_admin_id`. Admin can restart workflow (sets `content.current_step` to 0, `content.status` to `pending_review`).
*   **Versioning:** New `content_version` (snapshot of `content.content_data`) created on each approval or rejection.
*   **Overall Content Status:** `content.status` reflects lifecycle: `pending_review` (initial, restarted, in progress), `approved` (all steps complete), `rejected` (a step is rejected).

## 3. Implementation Plan (Revised based on Discovery)

### I. Database Schema Changes (in `migrations/consolidated_migrations.sql`)

1.  **`brands` Table:**
    *   Add `brand_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL`.
2.  **`workflows` Table (Existing Structure Utilized):
    *   No changes to its definition. Step definitions remain in `steps JSONB NOT NULL DEFAULT '[]'`.
    *   The `template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL` field is retained.
3.  **`workflow_user_assignments` Table (Existing Structure Utilized):
    *   No changes to its definition: `id UUID, workflow_id UUID, step_id INTEGER, user_id UUID`.
    *   This table links users (owners) to steps identified by their integer `step_id` (which corresponds to an ID or index within the `workflows.steps JSONB`).
4.  **`content` Table:**
    *   `current_step INTEGER DEFAULT 0` remains. This will reference the index or numeric `id` of the current step in the `workflow.steps JSONB` array.
    *   The `status content_status` enum (`draft`, `pending_review`, `approved`, `published`, `rejected`) will be managed as per the defined lifecycle.
    *   Existing `version INTEGER DEFAULT 1` and `published_version INTEGER` fields: No changes; these are not actively used by the new workflow logic.
5.  **`content_versions` Table (New Table):**
    *   Create: `content_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
        content_id UUID REFERENCES content(id) ON DELETE CASCADE NOT NULL, 
        workflow_step_identifier TEXT NOT NULL, -- Stores the integer id/index of the step from workflows.steps JSONB
        step_name TEXT, -- Denormalized for easier display, taken from the JSON step object
        version_number INT NOT NULL, 
        content_json JSONB, -- Snapshot of content.content_data
        action_status TEXT NOT NULL, -- e.g., 'Completed', 'Rejected' (reflecting the step action)
        feedback TEXT, 
        reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- User who took action
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );`
    *   Add index on `(content_id, version_number)` for efficient version lookups.
    *   Add index on `(content_id, workflow_step_identifier, created_at)`.

### II. API Endpoint Implementation

1.  **Content Workflow Actions API (`src/app/api/content/[id]/workflow-action/route.ts` - POST):**
    *   **Request Body:** `{ "action": "approve" | "reject", "feedback": string }`
    *   **Authorization:** Authenticated users.
    *   **Logic:**
        1.  Fetch `content` by `[id]`, get `workflow_id` and `current_step` (integer).
        2.  Fetch `workflow` by `workflow_id` to access `workflow.steps JSONB`.
        3.  Identify current step object from `workflow.steps[content.current_step]` (or match by `id` if steps in JSON have numeric IDs).
        4.  Query `workflow_user_assignments` using `workflow_id` and the current step's numeric ID/index to get `owner_id`. Verify current user is owner.
        5.  **If `approve`:**
            *   Create `content_versions` record: `action_status = 'Completed'`, `workflow_step_identifier = content.current_step`, `step_name` (from JSON), snapshot `content.content_data`, feedback, reviewer, new `version_number`.
            *   Determine next step index. If exists (`content.current_step + 1 < workflow.steps.length`), update `content.current_step`. `content.status` remains `'pending_review'`.
            *   If no next step, update `content.status` to `'approved'`.
        6.  **If `reject`:**
            *   Create `content_versions` record: `action_status = 'Rejected'`, `workflow_step_identifier = content.current_step`, `step_name`, snapshot `content.content_data`, feedback, reviewer.
            *   Update `content.status` to `'rejected'`.
        7.  Return success/error.
2.  **Brand Admin Workflow Restart API (`src/app/api/content/[id]/restart-workflow/route.ts` - POST):**
    *   **Authorization:** Authenticated. Current user must be `brand_admin_id` of the content's brand.
    *   **Logic:**
        *   Verify `content.status` is `'rejected'`.
        *   Update `content.current_step` to `0` (first step index).
        *   Update `content.status` to `'pending_review'`.
        *   Return success/error.

### III. Frontend UI (Modifications & New Views)

1.  **Content Detail Page (`src/app/dashboard/content/[id]/page.tsx`):
    *   API fetching content detail needs to ensure `workflow.steps JSONB` is available.
    *   `ContentApprovalWorkflow` component:
        *   Receives current step object (from `workflow.steps[content.current_step]`) and its assigned owner (looked up via `workflow_user_assignments`, potentially resolved by API).
        *   Displays historical feedback from `content_versions`.
        *   Action buttons call `/api/content/[id]/workflow-action`.
        *   Conditionally render actions based on current user vs. step owner.
2.  **"My Tasks" View (New/Enhanced Dashboard Section):
    *   Requires API to fetch content where logged-in user is owner of the `content.current_step` (joining `content`, `workflows`, `workflow_user_assignments`).
    *   Display relevant details.
3.  **Brand Admin Rejected Content View (New/Enhanced Admin Area):
    *   Requires API to fetch content for brands where user is `brand_admin_id` and `content.status = 'rejected'`.
    *   Display details and feedback history from `content_versions`.
    *   "Restart Workflow" button calls restart API.

### IV. Out of Scope for this MVP

*   Changes to UI/API for creating/editing `workflows` (these continue to manage `steps JSONB` and `workflow_user_assignments`).
*   Migration of existing `workflows.steps JSONB` to any new/different structure for step definition.
*   Real-time notifications.
*   Editing content *during* an active workflow (focus is on approving/rejecting the version at that step).

## 4. Open Questions/Considerations during Development

*   Generation of `version_number` in `content_versions` (e.g., `MAX(version_number) + 1` for the content_id).
*   Relationship between `content.body`/`meta_*` fields and `content.content_data` if `content_data` is the primary source for versioning. (MVP: `content_json` in versions snapshots `content_data`).
*   If `steps` in `workflows.steps JSONB` have unique numeric `id`s, these should be used for `content.current_step` and `content_versions.workflow_step_identifier` instead of array index, if more robust.

*   Exact logic for `version_number` generation in `