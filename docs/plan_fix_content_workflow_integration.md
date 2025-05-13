# Plan to Fix Content Creation and Workflow Integration

This document outlines the steps to fix issues related to content creation and its integration with workflows, specifically addressing how content is initialized into a workflow and how assignees are notified.

## Problem Summary:

1.  When new content is assigned a workflow, the `content.current_step` defaults to `0`. This might not correctly represent the *actual first step* if workflow steps use unique IDs rather than just array indices for identification, or if the first logical step isn't at index `0`.
2.  There is no automatic assignment or notification to the user(s) designated in the first step of the workflow when content is created and linked to that workflow.

## Proposed Solutions & Implementation Steps:

### 1. Ensure Correct Initialization of `content.current_step`

**Goal**: When content is created and a workflow is assigned, `content.current_step` should be set to the identifier of the *actual first step* of that workflow.

**Option A (Client-Side Responsibility - Recommended for initial `current_step`):**
*   **Logic**: The client-side (UI where content is created, e.g., `/dashboard/content/new/page.tsx`) will be responsible for determining the first step of the selected workflow.
*   **Steps**:
    1.  When a user selects a `workflow_id` in the content creation form:
        *   The client fetches the details of the selected workflow (e.g., via `GET /api/workflows/[workflow_id]`).
        *   From the fetched workflow data, it identifies the first step in the `steps` array (e.g., the step at index `0`, or the step with the lowest `order` / `id` if such a field exists and is used for sequencing).
        *   The client then determines the correct identifier for this first step. This identifier should match how `current_step` is interpreted by the backend (see point 3 below). For instance, if `workflow_action` uses `step.id`, then this `step.id` should be used.
    2.  When submitting the new content data to `POST /api/content`, the client includes this determined `current_step` value in the payload.
*   **Backend Change**: No change required to `POST /api/content` as it already accepts `current_step`.
*   **Pros**: Ensures the `current_step` is contextually correct based on the chosen workflow's actual structure before the content is even created.
*   **Cons**: Adds a small delay/extra fetch on the client-side during content creation if the workflow isn't already loaded.

**Option B (Backend Responsibility - More complex for initial `current_step` on new content):**
*   **Logic**: The `POST /api/content` endpoint, upon receiving a `workflow_id`, would fetch the workflow, determine its first step, and set `current_step` accordingly.
*   **Cons**: Makes the content creation API slightly more complex and slower. Less flexible if the definition of "first step" can vary.

**Chosen Approach for Initial `current_step`**: Option A is generally preferred for setting the *initial* `current_step` as the client has the most immediate context of the selected workflow.

### 2. Implement Proactive Assignment/Notification for First Step

**Goal**: When new content is created and enters the first step of a workflow, the assignee(s) of that step should be actively notified or have a task created.

**Recommended Approach (Asynchronous - Database Trigger & Edge Function/Background Job):**
*   **Mechanism**:
    1.  **Database Trigger**: Create a PostgreSQL trigger on the `content` table that fires `AFTER INSERT`.
    2.  **Trigger Function**: This function will:
        *   Check if the newly inserted `content` row has a `workflow_id` and a valid `current_step`.
        *   If so, fetch the corresponding `workflow` record (specifically its `steps` JSONB).
        *   Identify the current step object from the `steps` array based on the `NEW.current_step` value.
        *   Extract the `assignees` (e.g., array of user IDs or emails) from that current step object.
        *   For each assignee, insert a record into a new `user_tasks` table or a `notifications` table. This record would link to the `content.id`, `workflow.id`, the specific step, and the `assignee_user_id`.
            *   Alternatively, instead of direct table insertion, the trigger function could call `pg_notify` to send a payload to a listener.
    3.  **Supabase Edge Function / Background Worker (if using `pg_notify` or for more complex logic)**:
        *   An Edge Function could listen for notifications from `pg_notify` (if that path is chosen).
        *   This function would then be responsible for more complex actions like sending emails, push notifications, or integrating with external task management systems.
        *   If not using `pg_notify`, a scheduled job (e.g., a cron job running an Edge Function every few minutes) could scan for new content items in their initial workflow step that haven't had tasks/notifications generated.
*   **New Table (`user_tasks` - Example)**:
    ```sql
    CREATE TABLE IF NOT EXISTS user_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      content_id UUID REFERENCES content(id) ON DELETE CASCADE NOT NULL,
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
      workflow_step_id TEXT NOT NULL, -- Stores the ID/identifier of the step from the workflow JSON
      workflow_step_name TEXT,
      status TEXT DEFAULT 'pending', -- e.g., pending, in_progress, completed
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      due_date TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id_status ON user_tasks(user_id, status);
    ```
*   **Pros**: Decouples assignment/notification from the main content creation API call, improving performance and resilience. Handles this logic reliably at the database level or via a dedicated background process.
*   **Cons**: Adds database objects (trigger, function, potentially a new table). Edge Functions/background jobs add a bit more infrastructure.

**Alternative (Synchronous - Extend `POST /api/content` - Not Recommended for Scalability):**
*   The `POST /api/content` endpoint itself could, after successfully inserting the content, perform the logic to fetch workflow, identify assignees, and insert into `user_tasks` or `notifications`.
*   **Cons**: Makes the API call slower and more prone to failure if the notification/task part fails. Tightly couples content creation with notification logic.

### 3. Clarify and Standardize `content.current_step` Interpretation

**Goal**: Ensure consistency in how `content.current_step` (an INTEGER) maps to a step in the `workflows.steps` JSONB array.

*   **Decision Point**: Does `content.current_step` store:
    *   **Option 1: The array index** of the step in `workflows.steps` (e.g., 0, 1, 2...)?
    *   **Option 2: A unique numeric `id`** that is present within each step object in the `workflows.steps` JSONB (e.g., `steps: [{ "id": 101, "name": "Draft"}, {"id": 102, "name": "Review"}]`)?
*   **Current Observation**: `src/app/api/content/[id]/workflow-action/route.ts` appears to try `currentStepObject.id || currentStepIndex`. This can be ambiguous.
*   **Recommendation**: Standardize on **Option 2 (Unique Numeric `id` within step JSON)**.
    *   **Workflow Definition**: When workflows are created/edited, ensure each step in the `steps` JSONB is assigned a unique (within that workflow) numeric `id` (e.g., 1, 2, 3... or more complex IDs if needed, but they must be numbers if `content.current_step` is an INTEGER).
    *   **`content.current_step` Storage**: This column will store this unique numeric `id` of the active step.
    *   **Code Changes**:
        *   Update any code that initializes `content.current_step` (client-side as per point 1, or backend if chosen) to use the `step.id`.
        *   Update `src/app/api/content/[id]/workflow-action/route.ts` and any other logic that retrieves the current step to *solely* use `content.current_step` to find the matching step object in `workflow.steps` where `step.id === content.current_step`.
        *   The `workflow_user_assignments.step_id` if still used, should also align with this numeric step ID.
*   **Pros**: More robust. Step order can be changed within the JSONB array without invalidating `content.current_step` values, as long as the step `id`s remain stable for existing steps. Makes referencing specific steps less ambiguous than array indices.
*   **Cons**: Requires ensuring unique numeric `id`s are managed correctly during workflow definition/editing. If `content.current_step` needs to store non-numeric UUIDs for steps in the future, its type would need to change (e.g., to TEXT).

## Documentation and Future Considerations:

*   Document the chosen approach for `current_step` initialization and assignee notification clearly for future developers.
*   Update the `content_workflow_integration_investigation.md` to reflect these planned changes once implemented.
*   Consider how users are actually assigned to workflow steps (e.g., array of user IDs in the `assignees` field of each step in `workflows.steps` JSONB). Ensure this is robust.
*   The new `user_tasks` table would need UI components to display tasks to users.

## Addendum: Consideration of Normalizing `workflow_steps` into a Separate Table

During the investigation and planning, a key architectural consideration arose: whether to normalize the `workflows.steps` (currently a JSONB array) into a separate `workflow_steps` SQL table. This was prompted by the discovery that step objects within the JSONB are identified by array index rather than persistent unique IDs, which impacts how `content.current_step` and other step references are handled.

**Current State:** Steps are stored as a JSONB array in `workflows.steps`. Identification is by 0-based array index.

**Proposed Alternative: Separate `workflow_steps` Table**

*   **Schema Example**:
    ```sql
    CREATE TABLE IF NOT EXISTS workflow_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique persistent ID for each step
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      role TEXT NOT NULL, -- Or potentially a foreign key to a roles table
      approval_required BOOLEAN DEFAULT TRUE,
      step_order INTEGER NOT NULL, -- Explicitly defines sequence
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id_order ON workflow_steps(workflow_id, step_order);

    -- Optional: Separate table for step assignees if many-to-many or more details needed per assignment
    CREATE TABLE IF NOT EXISTS workflow_step_assignees (
      step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      PRIMARY KEY (step_id, user_id)
    );
    ```
*   `content.current_step` would then store the UUID `id` from this `workflow_steps` table.

**Advantages of Normalization:**
1.  **Relational Integrity**: Proper primary/foreign keys, data type enforcement.
2.  **Robust Step Identification**: Each step gets a persistent unique UUID, resolving the index vs. ID ambiguity for `content.current_step`.
3.  **Simplified Querying**: Easier and more performant SQL queries for steps, assignees, and tasks.
4.  **Explicit Ordering**: `step_order` column makes sequencing clear and manageable.
5.  **Scalability**: Better for complex queries as data grows.
6.  **Clearer Schema**: Step structure is explicitly defined.

**Disadvantages/Challenges of Normalization:**
1.  **Increased Complexity for CRUD**: Workflow creation/updates would involve multiple table operations (potentially requiring transactions).
2.  **Data Migration**: Existing JSONB steps would need to be migrated to the new table structure.
3.  **Significant Refactoring**: APIs (e.g., `POST/PUT /api/workflows`, `GET /api/workflows/[id]`) and UI components managing workflow definitions would require substantial changes.
4.  **Potentially More Database Calls**: Fetching a full workflow might involve joins or additional queries for steps.

**Impact on Current Plan (`docs/plan_fix_content_workflow_integration.md`):**
*   **Point 1 (Correct `current_step` Initialization)**: Would be simplified as the client would fetch the first step's UUID `id`.
*   **Point 2 (Proactive Assignment Trigger)**: The trigger logic would query the new `workflow_steps` and `workflow_step_assignees` tables, which could be cleaner.
*   **Point 3 (Standardize `current_step` Interpretation)**: This point would be inherently resolved by using UUIDs from the new table.

**Recommendation Regarding Timing:**

Normalizing `workflow_steps` is a significant architectural improvement that offers long-term benefits, particularly for data integrity and querying flexibility. However, it also represents a considerable development effort due to data migration and the refactoring of multiple APIs and UI components.

*   **Option 1 (Proceed with current plan, defer normalization):** Address the immediate user-facing issues (content not starting on the right step, no notifications) by working *with* the existing JSONB structure and standardizing on 0-based indices for step identification. This is a smaller, more targeted set of changes.
    *   **Pros**: Faster to implement fixes for current pain points.
    *   **Cons**: Retains the limitations of JSONB for complex step-related queries and the potential for ambiguity if step identification isn't handled with extreme care everywhere.
*   **Option 2 (Normalize first, then implement rest of plan):** Undertake the `workflow_steps` table normalization as a foundational step before implementing the `current_step` initialization and notification trigger logic.
    *   **Pros**: Builds on a more robust and scalable foundation, potentially simplifying the trigger logic and `current_step` handling.
    *   **Cons**: Delays fixing the immediate user-facing issues due to the larger refactoring effort.

**Decision Point for the Team:** Does the current ambiguity and limitations of using 0-based indices for step identification present a significant enough risk or complexity to warrant the larger refactoring effort of table normalization *before* addressing the immediate functional gaps? Or, is it preferable to deliver the functional fixes more quickly using the existing structure and earmark table normalization as a subsequent technical debt item or improvement project?

This addendum should be considered alongside the main plan to make an informed decision on the implementation order. 