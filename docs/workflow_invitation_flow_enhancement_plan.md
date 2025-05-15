# Workflow Invitation Flow Enhancement Plan

## Current State of the Application

The current implementation of the workflow invitation process has a few issues that need addressing. The invitation process works correctly from the `/users/invite` page but not consistently from the workflow creation (`/dashboard/workflows/new`) and editing (`/dashboard/workflows/[id]/edit`) pages. This discrepancy is due to differences in how new assignees (users who don't yet have an account) are identified and processed, particularly when editing existing workflows.

## Identified Problems

1.  **Assignee Identification Inconsistency**:
    *   The primary method for identifying new assignees in workflow forms relies on checking if an `assignee.id` starts with a temporary prefix (e.g., `temp_`). This is prone to errors, especially in the workflow *edit* flow, where a temporary ID might be incorrectly persisted or misinterpreted, leading to new users not being invited.
    *   This method lacks a clear, explicit flag to distinguish a newly typed email from an existing, selected user.

2.  **Duplicated and Disparate Invitation Logic**:
    *   User invitation logic is spread across multiple API endpoints:
        *   `/api/users/invite/route.ts` uses a dedicated `inviteNewUserWithAppMetadata` function.
        *   `/api/workflows/route.ts` (for new workflows) and `/api/workflows/[id]/route.ts` (for editing workflows) contain separate, direct Supabase client calls (`supabase.auth.admin.inviteUserByEmail`) and RPC calls for handling invitations.
    *   This duplication increases the risk of inconsistencies, bugs, and makes maintenance more complex.

3.  **Insufficient `full_name` Handling**:
    *   The `full_name` of a new user might not be consistently captured or passed through all invitation paths, potentially leading to impersonalised invitation emails or missing data for new user profiles.

4.  **Limited Error Handling and Observability**:
    *   Current error handling for the invitation process within workflow API routes is basic. If an invitation fails (e.g., Supabase API error), it might not be clearly reported to the frontend or logged with sufficient detail for debugging.
    *   There's no mechanism to handle partial failures (e.g., if a workflow is saved but some invitations fail).
    *   Lack of detailed metrics for invitation attempts, successes, and failures makes it hard to monitor the health of this feature.

5.  **Unverified "Complete Invite" Metadata Processing**:
    *   It's not fully confirmed that the `/api/auth/complete-invite/route.ts` path correctly and atomically processes all necessary `app_metadata` fields (like `invited_to_brand_id`, `intended_role`, `invited_from_workflow`, `step_id_for_assignment`) from the invitation JWT when a user accepts and completes their registration.

## Proposed Solutions

1.  **Normalise Assignee Identification (Frontend & Backend)**:
    *   **Frontend**: Modify the `Assignee` TypeScript type used in workflow forms to include an explicit `isNew: boolean` flag. This flag will be `true` when an email is typed in for a new user and `false` for existing users selected from search.
    *   **Backend**: API routes (`/api/workflows/route.ts`, `/api/workflows/[id]/route.ts`) will rely on this `isNew` flag (or `assignee.id && !/^temp_new_/.test(assignee.id)` if `isNew` cannot be passed) to reliably identify users needing an invitation, rather than solely checking `assignee.id`. New users will be sent with `id: null` or the temporary ID will be ignored if `isNew` is true.

2.  **Centralise Invitation Logic into a Shared Service**:
    *   **Create `src/lib/auth/invitationService.ts` (or similar)**: This service will encapsulate all user invitation logic.
    *   **Service Function Signature**: Export a function like `async function inviteUser(options: { email: string; fullName?: string; intendedRole: string; invitedFrom: 'workflow' | 'user_invite_page'; inviterUserId: string; appMetadata: Record<string, any>; stepId?: string; workflowId?: string; })`.
    *   **Responsibilities**:
        *   Internally call `supabase.auth.admin.inviteUserByEmail`.
        *   Construct and pass appropriate `app_metadata` (including `invited_to_brand_id`, `intended_role`, `invited_from_workflow`, `step_id_for_assignment`, `workflow_id`).
        *   Handle logging of the invitation attempt and result (e.g., to a `workflow_invitations` table or via an RPC).
        *   Consolidate the functionality currently in `inviteNewUserWithAppMetadata` and the direct Supabase calls within workflow APIs.
    *   **Usage**: Refactor `/api/users/invite/route.ts`, `/api/workflows/route.ts`, and `/api/workflows/[id]/route.ts` to use this new service.

3.  **Consistent `full_name` Capture and Usage**:
    *   Ensure workflow forms and the user invite page capture `full_name` for new users.
    *   The new `invitationService` will accept and use `fullName` for the invitation `user_metadata` and potentially store it in `app_metadata` if needed for the "complete invite" step.

4.  **Enhance Error Handling and Observability**:
    *   **Robust `try/catch` Blocks**: Wrap all calls to the new `invitationService` and its internal Supabase calls in `try/catch` blocks.
    *   **Detailed Logging**: Log the email address, metadata sent, and the Supabase response (success or error code/message) for each invitation attempt.
    *   **Metrics/Events**: Emit events or metrics for "invite_attempted", "invite_succeeded", "invite_failed" (with error reasons) to allow for monitoring and alerting.
    *   **Partial Failure Reporting**: Modify `/api/workflows` endpoints to return information about which invitations succeeded and which failed if multiple assignees are processed. The frontend can then display appropriate toasts or allow retries for failed invites.

5.  **Thorough Review and Hardening of the "Complete-Invite" Path**:
    *   **Verify Metadata Processing**: Audit `src/app/api/auth/complete-invite/route.ts` to ensure it correctly retrieves all required fields from `app_metadata` (e.g., `invited_to_brand_id`, `intended_role`, `invited_from_workflow`, `step_id_for_assignment`).
    *   **Atomic Operations**: Confirm that all database updates upon completing an invitation (e.g., creating user profile, updating roles, assigning to workflow steps) are performed atomically, ideally within a single transaction or RPC call to prevent partial data states.

## RPC Considerations

The existing RPC functions (`create_workflow_and_log_invitations`, `update_workflow_and_handle_invites`) are currently called by the workflow API routes.
*   **Review Interaction**: Analyse if these RPCs are still necessary or if their logic (especially the "log_invitations" part) can be fully absorbed or better handled by the new `invitationService` and direct Supabase table interactions (e.g., with `workflow_invitations` table).
*   **Potential Simplification**: The goal should be to simplify. If the RPCs are primarily for transactional integrity when creating/updating workflows *and* handling invites, the new `invitationService` might be called *before* or *after* a simplified RPC that only handles workflow data persistence. Alternatively, the service could log to a staging table, and the RPC could process this.
*   **Idempotency**: Ensure any logging or assignment logic is idempotent, especially if retries are implemented.

## Test Strategy

1.  **Unit Tests**:
    *   For the new `src/lib/auth/invitationService.ts`: Mock the Supabase client and other external dependencies to test its logic for constructing `app_metadata`, handling different input parameters, and logging.
2.  **Integration Tests**:
    *   For API routes (`/api/users/invite`, `/api/workflows`, `/api/workflows/[id]`, `/api/auth/complete-invite`): Test these endpoints by mocking external services (like Supabase Auth at a higher level if possible) and verifying database changes and responses.
    *   Specifically test the "complete invite" flow by simulating a user clicking an invite link with relevant metadata and ensuring user profile and workflow assignments are correctly updated.
3.  **End-to-End (E2E) Tests**:
    *   Simulate user flows for:
        *   Inviting a new user directly via the users page.
        *   Adding a new user as an assignee when creating a new workflow.
        *   Adding a new user as an assignee when editing an existing workflow.
        *   A new user receiving an invitation email, clicking the link, completing registration, and verifying they are correctly assigned/have the correct role.
    *   Test edge cases like inviting an existing user, inviting a user who was already invited, and handling API errors gracefully in the UI.

## Next Steps

1.  Implement the proposed solutions in the codebase, starting with the `Assignee` type update and the `invitationService`.
2.  Refactor existing API routes to use the new service.
3.  Implement enhanced error handling and logging.
4.  Write unit, integration, and E2E tests as outlined.
5.  Thoroughly test all invitation flows manually.
6.  Review the changes with a senior developer to ensure they meet the project's standards and requirements.

---

This document outlines the current issues with the workflow invitation process and proposes detailed solutions to address them. The next steps involve implementing these solutions and testing them to ensure they resolve the identified problems. Further review by a senior developer will help ensure the changes align with the project's goals and standards. 