# Discovery and Remediation Plan - MixerAI Application Review

## 1. Introduction

This document outlines the findings from a targeted discovery phase focused on user flows, invitation mechanisms, role assignments, AI tool integrations, and overall system coherence within the MixerAI application. It details identified discrepancies, bugs, and proposes a remediation plan with specific solutions and code examples to align the application with documented requirements and user expectations.

This plan is intended for review by senior development staff before implementation.

## 2. Critical: User Invitation & Role Assignment (`/api/auth/complete-invite/route.ts`)

The most critical area requiring immediate attention is the `/api/auth/complete-invite/route.ts` script. It is central to all user onboarding flows but currently fails to correctly process invitations from different sources, leading to incorrect or missing role and permission assignments.

### 2.1. Identified Issues

1.  **Metadata Field Mismatch:** The script attempts to read `app_metadata` using field names that are inconsistent with what is being set by the various invitation-initiating API routes (`/api/users/invite`, `PUT /api/brands/[id]`, `POST/PUT /api/workflows/...`).
2.  **Missing Superadmin Global Role Logic:** There's no logic to assign the global Superadmin role (i.e., setting `user_metadata.role = 'admin'`) when a user completes an invitation intended for a Superadmin.
3.  **Inadequate Differentiation of Invite Sources:** The script does not robustly differentiate between the three primary invitation sources, each of which sets slightly different `app_metadata` payloads:
    *   Direct Superadmin invites (for new Superadmins or Brand Admins via `/api/users/invite`).
    *   Brand Admin assignments/invites (for new Brand Admins via `PUT /api/brands/[id]`).
    *   Workflow step assignments (for new Standard Users via `POST /api/workflows/` or `PUT /api/workflows/[id]/`).
4.  **Incomplete Workflow User Setup:** For users invited via workflows, the process of updating the `workflow_invitations` table and ensuring an entry in `workflow_user_assignments` is not clearly handled by the current `complete-invite` logic.

### 2.2. Summary of `app_metadata` Set by Invitation Sources

To correctly implement `complete-invite`, understanding what `app_metadata` each invite flow sets is crucial:

*   **`/api/users/invite` (Direct Admin Invite by Superadmin):**
    *   `app_metadata.invite_type = 'direct_user_invite'`
    *   `app_metadata.intended_role = 'admin' | 'editor' | 'viewer'` (the role being granted)
    *   `app_metadata.invited_to_brand_id = <brand_uuid> | null` (null for Superadmin invite)
    *   `app_metadata.inviter_id = <inviter_user_uuid>`
*   **`PUT /api/brands/[id]` (Brand Admin Assignment/Invite by existing Brand Admin):**
    *   `app_metadata.invite_type = 'brand_admin_invite_on_update'`
    *   `app_metadata.intended_role = 'admin'` (as they are being made a Brand Admin)
    *   `app_metadata.assigned_as_brand_admin_for_brand_id = <brand_uuid>` (the brand they will administer)
    *   `app_metadata.inviter_id = <inviter_user_uuid>`
*   **`POST/PUT /api/workflows/...` (Workflow Step Assignment/Invite):**
    *   This flow calls `supabase.auth.admin.inviteUserByEmail()` with a `data` payload that becomes `app_metadata`.
    *   `app_metadata.role = 'admin' | 'editor' | 'viewer'` (role for the user within the workflow's brand context, derived from step definition)
    *   `app_metadata.invited_from_workflow = <workflow_uuid>` (the workflow they are invited to)
    *   `app_metadata.invited_by = <inviter_user_uuid>`
    *   Potentially: `app_metadata.original_step_id_for_assignment` (if we decide to pass the specific step ID this way for `workflow_user_assignments` later).

### 2.3. Recommended Solution for `/api/auth/complete-invite/route.ts`

The script needs a comprehensive overhaul. The following pseudo-TypeScript illustrates the proposed logic:

```typescript
// File: src/app/api/auth/complete-invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth'; // Assumes user is authenticated
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase'; // Assuming this type exists

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, user: any) => {
  const supabase = createSupabaseAdminClient();
  const userId = user.id;
  const userEmail = user.email;
  const appMetadata = user.app_metadata || {}; // Ensure appMetadata is an object
  const existingUserMetadata = user.user_metadata || {};

  console.log(`[complete-invite] Starting for user ${userId}, email ${userEmail}. AppMetadata:`, appMetadata);

  try {
    let intendedRole: string | null = null;
    let brandIdForPermission: string | null = null;
    let workflowIdForContext: string | null = null;
    let inviteSource: 'direct_admin' | 'brand_assignment' | 'workflow_assignment' | 'unknown' = 'unknown';
    let stepIdForWorkflowAssignment: number | string | null = null; // For workflow_user_assignments

    // Priority 1: Check for direct admin invite or brand admin assignment from /api/users/invite
    if (appMetadata.invite_type === 'direct_user_invite' && appMetadata.intended_role) {
      intendedRole = appMetadata.intended_role;
      brandIdForPermission = appMetadata.invited_to_brand_id || null;
      inviteSource = 'direct_admin';
      console.log(`[complete-invite] Source: 'direct_user_invite'. Role: ${intendedRole}, BrandID: ${brandIdForPermission}`);

    // Priority 2: Check for brand admin assignment from PUT /api/brands/[id]
    } else if (appMetadata.invite_type === 'brand_admin_invite_on_update' && appMetadata.intended_role && appMetadata.assigned_as_brand_admin_for_brand_id) {
      intendedRole = appMetadata.intended_role; // Should be 'admin'
      brandIdForPermission = appMetadata.assigned_as_brand_admin_for_brand_id;
      inviteSource = 'brand_assignment';
      console.log(`[complete-invite] Source: 'brand_assignment'. Role: ${intendedRole}, BrandID: ${brandIdForPermission}`);

    // Priority 3: Check for workflow assignment invite
    } else if (appMetadata.invited_from_workflow && appMetadata.role) {
      intendedRole = appMetadata.role;
      workflowIdForContext = appMetadata.invited_from_workflow;
      inviteSource = 'workflow_assignment';
      // Potentially, appMetadata.original_step_id or similar should be set by workflow invite process
      stepIdForWorkflowAssignment = appMetadata.original_step_id_for_assignment || appMetadata.step_id || null;
      console.log(`[complete-invite] Source: 'workflow_assignment'. Role: ${intendedRole}, WorkflowID: ${workflowIdForContext}, StepID: ${stepIdForWorkflowAssignment}`);

      if (workflowIdForContext) {
        const { data: workflowData, error: wfError } = await supabase
          .from('workflows')
          .select('brand_id')
          .eq('id', workflowIdForContext)
          .single();
        if (wfError) throw new Error(`Failed to fetch brand_id for workflow ${workflowIdForContext}: ${wfError.message}`);
        if (!workflowData?.brand_id) throw new Error(`Workflow ${workflowIdForContext} has no associated brand_id.`);
        brandIdForPermission = workflowData.brand_id;
        console.log(`[complete-invite] Fetched BrandID ${brandIdForPermission} from WorkflowID ${workflowIdForContext}`);
      } else {
        throw new Error('Workflow assignment invite detected but no workflowIdForContext found in appMetadata.');
      }
    } else {
      console.warn(`[complete-invite] Could not determine invite type or essential metadata missing for user ${userId}. AppMetadata:`, appMetadata);
      return NextResponse.json({ success: true, message: 'Invite confirmed, but specific permissions could not be automatically assigned due to missing invite context. Please contact an administrator.' });
    }

    // Validate Role
    if (!intendedRole) {
        console.warn(`[complete-invite] No intendedRole could be determined for user ${userId}. Skipping permission assignment.`);
        return NextResponse.json({ success: true, message: 'Invite confirmed, but no role was specified for assignment.' });
    }
    const validRoles: Array<Database['public']['Enums']['user_role']> = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(intendedRole as any)) {
      throw new Error(`Invalid role determined: ${intendedRole} for user ${userId}`);
    }

    // --- Assign Permissions / Update User Metadata ---

    // Superadmin Global Role Assignment
    if (inviteSource === 'direct_admin' && intendedRole === 'admin' && !brandIdForPermission) {
      console.log(`[complete-invite] Assigning Superadmin role to user ${userId}`);
      const { error: updateMetaError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { ...existingUserMetadata, role: 'admin' } } // Sets global admin role
      );
      if (updateMetaError) throw new Error(`Failed to set user_metadata.role for Superadmin ${userId}: ${updateMetaError.message}`);
      console.log(`[complete-invite] Successfully set user_metadata.role = 'admin' for Superadmin ${userId}`);

    // Brand-Specific Role Assignment
    } else if (brandIdForPermission && intendedRole) {
      console.log(`[complete-invite] Assigning role '${intendedRole}' to user ${userId} for brand ${brandIdForPermission} (Source: ${inviteSource})`);
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .upsert({
          user_id: userId,
          brand_id: brandIdForPermission,
          role: intendedRole as Database['public']['Enums']['user_role'],
        }, { onConflict: 'user_id,brand_id' }); // Ensure 'user_id,brand_id' is your unique constraint for upsert

      if (permissionError) throw new Error(`Failed to assign brand permission for user ${userId}, brand ${brandIdForPermission}: ${permissionError.message}`);
      console.log(`[complete-invite] Successfully assigned brand permission to user ${userId} for brand ${brandIdForPermission}.`);

      // If invite was from a workflow, update workflow_invitations and ensure workflow_user_assignments
      if (inviteSource === 'workflow_assignment' && workflowIdForContext) {
        const { error: updateWfInviteError } = await supabase
          .from('workflow_invitations')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('email', userEmail)
          .eq('workflow_id', workflowIdForContext)
          .eq('status', 'pending');
        if (updateWfInviteError) console.warn(`[complete-invite] Failed to update status for workflow_invitation (email: ${userEmail}, workflow: ${workflowIdForContext}): ${updateWfInviteError.message}`);
        else console.log(`[complete-invite] Updated workflow_invitation status to accepted for email ${userEmail}, workflow ${workflowIdForContext}`);

        if (stepIdForWorkflowAssignment !== null) { // Ensure step_id was found/passed
          const { error: assignError } = await supabase
            .from('workflow_user_assignments')
            .upsert({
              workflow_id: workflowIdForContext,
              step_id: Number(stepIdForWorkflowAssignment), // Ensure step_id is number if column is INTEGER
              user_id: userId,
            }, { onConflict: 'workflow_id,step_id,user_id' }); // Ensure this is your unique constraint
          if (assignError) console.warn(`[complete-invite] Failed to ensure user ${userId} in workflow_user_assignments for workflow ${workflowIdForContext}, step ${stepIdForWorkflowAssignment}: ${assignError.message}`);
          else console.log(`[complete-invite] User ${userId} assignment to workflow ${workflowIdForContext}, step ${stepIdForWorkflowAssignment} ensured.`);
        } else {
            console.warn(`[complete-invite] No step_id available in appMetadata for workflow user assignment (user: ${userId}, workflow: ${workflowIdForContext}).`);
        }
      }
    } else {
      // This condition implies an issue with logic or unexpected metadata if intendedRole was set but no target (brand or global)
      console.warn(`[complete-invite] User ${userId} confirmed with role '${intendedRole}' but no brand/workflow association found and not a Superadmin invite. Main permissions not assigned.`);
      return NextResponse.json({ success: true, message: 'Invite confirmed, but no specific brand/workflow association found for permission assignment.' });
    }

    // Optional: Clean up consumed app_metadata fields
    // Consider which fields are purely for invite and can be cleared.
    // const metadataToClear = {
    //   intended_role: undefined, invited_to_brand_id: undefined, invite_type: undefined,
    //   assigned_as_brand_admin_for_brand_id: undefined, invited_from_workflow: undefined, role: undefined,
    //   original_step_id_for_assignment: undefined
    // };
    // const { error: finalMetaUpdateError } = await supabase.auth.admin.updateUserById(userId, {
    //     app_metadata: { ...appMetadata, ...metadataToClear }
    // });
    // if (finalMetaUpdateError) console.warn('[complete-invite] Failed to clean up app_metadata after processing invite:', finalMetaUpdateError);

    return NextResponse.json({ success: true, message: 'Invite process completed successfully. Permissions assigned.' });

  } catch (error: any) {
    console.error('[complete-invite] Error in handler:', error);
    return handleApiError(error, `Failed to complete invite process: ${error.message}`);
  }
});
```

### 2.4. Key Changes and Rationale for `complete-invite`

*   **Prioritized Metadata Checking:** The logic now checks for specific `app_metadata` patterns in a defined order to correctly identify the invitation source.
*   **Superadmin Logic:** Explicitly checks for a Superadmin invite (`invite_type === 'direct_user_invite'`, `intended_role === 'admin'`, no `brandIdForPermission`) and sets `user_metadata.role = 'admin'`.
*   **Brand Admin Assignment:** Correctly uses `assigned_as_brand_admin_for_brand_id` and `intended_role` from `app_metadata` set by `PUT /api/brands/[id]`.
*   **Workflow Invite Processing:**
    *   Uses `invited_from_workflow` and `app_metadata.role` (set by workflow API routes).
    *   Fetches the `brand_id` from the `workflow_id`.
    *   Assigns brand permissions (`user_brand_permissions`) based on this.
    *   Updates the corresponding `workflow_invitations` record.
    *   Upserts into `workflow_user_assignments`. (Requires `step_id` to be available in `app_metadata`, e.g. as `original_step_id_for_assignment` or `step_id` - this needs to be ensured by the workflow invite process).
*   **Robust Role Validation:** Ensures `intendedRole` is one of the valid enum values.
*   **Clear Console Logging:** Added more detailed logging for easier debugging.
*   **Idempotency:** Uses `upsert` for permission and assignment tables.

## 3. AI Tools - Brand Detection from URL (`/api/tools/...`)

### 3.1. Identified Issue

The `/api/tools/alt-text-generator/route.ts` and `/api/tools/metadata-generator/route.ts` currently require a `brandId` to be explicitly sent in the API request. They do not implement the user flow requirement (User Flows 6.1 & 6.3) of:
1.  Accepting a general website URL from the user.
2.  Attempting to infer the `brandId` by matching the domain of this URL against `brands.website_url`.
3.  Proceeding with AI generation (with or without brand context).
4.  Alerting the frontend if no brand match was found, so a "use at your own risk" message can be shown.

### 3.2. Recommended Solution

Modify these API routes as follows:

1.  Change the request body to accept an optional `websiteUrlForBrandDetection: string` instead of, or in addition to, a direct `brandId`. If `brandId` is provided directly, it can be used.
2.  If `websiteUrlForBrandDetection` is provided and no `brandId`:
    *   Parse the domain from `websiteUrlForBrandDetection`.
    *   Query the `brands` table: `SELECT id, name, country, language, brand_identity, tone_of_voice, guardrails FROM brands WHERE website_url ILIKE 'https://' || domain || '%' OR website_url ILIKE 'http://' || domain || '%' LIMIT 1;` (Adjust ILIKE pattern for robustness, ensure `website_url` in DB is stored consistently, e.g., with protocol).
    *   If a brand is found, use its `id` and other details as context.
    *   If no brand is found, set a flag in the API response (e.g., `brandContextUsed: false, brandMatchFound: false`). The AI generation should still proceed but without specific brand context.
3.  The frontend will then check this flag. If `brandMatchFound` is false, it displays the "Generated content may not be brand-aligned. Use at your own risk." message.
4.  Ensure the core AI generation functions (`generateAltText`, `generateMetadata` in `@/lib/azure/openai.ts`) continue to not use template fallbacks if the AI call itself fails (current behavior is correct).

**Conceptual Snippet for Brand Detection Logic in API Route:**

```typescript
// Inside the POST handler for an AI tool API route:
// const body = await request.json(); // Contains body.imageUrl, body.websiteUrlForBrandDetection, body.brandId (optional)

let brandContextToUse: BrandContextType | null = null; // Define BrandContextType appropriately
let brandMatchFound = false;
let brandContextUsed = false;

if (body.brandId) {
    // Fetch brand by ID (existing logic)
    // ...
    if (fetchedBrand) {
        brandContextToUse = fetchedBrand;
        brandMatchFound = true;
        brandContextUsed = true;
    }
} else if (body.websiteUrlForBrandDetection) {
    try {
        const url = new URL(body.websiteUrlForBrandDetection);
        const domain = url.hostname.replace(/^www\./, ''); // Simple domain extraction

        const { data: matchedBrand, error: dbError } = await supabase
            .from('brands')
            .select('id, name, country, language, brand_identity, tone_of_voice, guardrails')
            // Robust matching for domain needed here. Example:
            .or(`website_url.ilike.https://${domain}%,website_url.ilike.http://${domain}%,website_url.ilike.%//${domain}%`)
            .limit(1)
            .single();

        if (dbError && dbError.code !== 'PGRST116') { /* PGRST116: no rows found */
            console.warn('[AI Tool] DB error looking up brand by URL:', dbError);
        }
        if (matchedBrand) {
            brandContextToUse = matchedBrand;
            brandMatchFound = true;
            brandContextUsed = true;
            console.log(`[AI Tool] Brand context found for URL ${body.websiteUrlForBrandDetection}: ID ${matchedBrand.id}`);
        } else {
            console.log(`[AI Tool] No brand context found for URL ${body.websiteUrlForBrandDetection}`);
        }
    } catch (e) {
        console.warn('[AI Tool] Invalid URL provided for brand detection:', body.websiteUrlForBrandDetection);
    }
}

// ... proceed to call AI generation function, passing brandContextToUse (which might be null) ...
// const aiResult = await generateAltText(body.imageUrl, brandContextToUse?.language, ... , { brandIdentity: brandContextToUse?.brand_identity, ... });

// In the response:
// return NextResponse.json({ success: true, ...aiResult, brandMatchFound, brandContextUsed });
```

## 4. Initial Superadmin Seeding

### 4.1. Identified Issue

No automated process exists for creating the first Superadmin user (`peter.pitcher@genmills.com`). Superadmin status currently relies on `user_metadata.role = 'admin'`.

### 4.2. Recommended Solution

Implement one of the following:

1.  **Database Seed Script (Recommended for reproducibility):**
    *   Create an SQL script that can be run against the Supabase database.
    *   This script would:
        *   Use `supabase.auth.admin.createUser()` (or direct SQL if confident with `auth.users` table structure and triggers) to create the user with email `peter.pitcher@genmills.com` and a temporary or pre-defined password.
        *   Set the user's `user_metadata` to include `{ "role": "admin" }`.
        *   The `create_profile_for_user` trigger should automatically create the corresponding `public.profiles` entry. If `raw_user_meta_data` can be set during user creation, include `full_name`, `job_title`, `company`. Otherwise, these can be updated by the user later or via a subsequent SQL statement.
    *   Example conceptual Supabase JS (for a server-side script):
        ```javascript
        // const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        //   email: 'peter.pitcher@genmills.com',
        //   password: 'TEMPORARY_STRONG_PASSWORD', // User should change this
        //   email_confirm: true, // Or false if not requiring email confirmation for first admin
        //   user_metadata: {
        //     role: 'admin',
        //     full_name: 'Peter Pitcher' // Optional: prefill profile data
        //   }
        // });
        // if (createError) throw createError;
        // console.log('Superadmin created:', authUser.user.id);
        // // Profile table entry should be handled by trigger.
        ```

2.  **Documented Manual Procedure:**
    *   Clearly document the steps for a database administrator to perform using Supabase Studio or `psql`:
        1.  Invite `peter.pitcher@genmills.com` via the Supabase Dashboard (Auth > Users > Invite user).
        2.  After the user accepts and is in `auth.users`, manually update their "User Metadata" via Supabase Studio to add: `{"role": "admin"}`.
        3.  Ensure their `profiles` record is created and populated (the trigger should handle this).

## 5. Initial Workflow Step Assignment & Task Creation for New Users

### 5.1. Identified Issue

The database trigger `handle_new_content_workflow_assignment` creates `user_tasks` when new content is created by looking up assignees for the first step in `profiles`. If the first-step assignee is a new user (invited when the workflow was defined but hasn't signed up yet), this trigger won't find them, and no task is created at that point.

### 5.2. Recommended Solution

1.  **Ensure `complete-invite` populates `workflow_user_assignments`:** As detailed in Section 2, the updated `/api/auth/complete-invite` logic must ensure that when a user invited via a workflow completes their signup, an entry is made in `workflow_user_assignments` linking them to the workflow and step. The `step_id` for this needs to be available in `app_metadata` (e.g., as `app_metadata.original_step_id_for_assignment` or `app_metadata.step_id`, set during the workflow API call that triggers the invite).
2.  **Task Creation for Newly Signed-Up Users:** Once the user exists in `profiles` and `workflow_user_assignments`:
    *   **Option 1 (Trigger on `workflow_user_assignments`):** Create a new database trigger that fires `AFTER INSERT ON workflow_user_assignments`. This trigger would:
        *   Check if there are any `content` items currently at the `NEW.step_id` of the `NEW.workflow_id` to which this `NEW.user_id` has just been assigned.
        *   For each such content item, if a `user_task` doesn't already exist for this user, content, and step, create it.
    *   **Option 2 (Extend `complete-invite`):** After `complete-invite` successfully creates the `workflow_user_assignments` entry, it could query for active content at that workflow/step and create the `user_tasks`. This makes `complete-invite` more complex.
    *   **Option 3 (UI-Driven/Periodic Check):** The UI could trigger a task sync, or a less frequent backend job could scan for missing tasks. (Less ideal for immediate task visibility).

    *Option 1 (new trigger) is generally cleaner for ensuring data consistency at the database level.*

## 6. Bug: Missing Workflow Info on Content Creation (User-Reported)

### 6.1. Identified Issue

User reported that "some workflow information is not being added to the content record when it's being created."

### 6.2. Analysis & Recommendation

The `POST /api/content/route.ts` API endpoint *does* accept `workflow_id` and `template_id` in the request body and saves them to the new content record.
This suggests the issue is likely **client-side**.
*   **Recommendation:** Review the frontend logic responsible for content creation, especially when creating content from a template (User Flow 3.1). Ensure that:
    *   The selected template's associated `workflow_id` is correctly fetched.
    *   Both `template_id` and the associated `workflow_id` are correctly included in the payload sent to `POST /api/content`.

## 7. Workflow Step Storage

### 7.1. Current State

*   Workflow step definitions (name, description, roles, etc.) are stored within a JSONB column (`steps`) in the `workflows` table.
*   Assignments of *existing* users to steps are normalized into the `workflow_user_assignments` table (linking `user_id`, `workflow_id`, `step_id`).
*   Invitations for *new* users to workflow steps are managed in the `workflow_invitations` table.

### 7.2. Recommendation

The current approach for normalizing assignments and invitations out of the JSONB is reasonable. The user's concern about steps being "split into a new table so that they can be referenced more easily" is largely addressed for the *user assignment* aspect.
*   **Recommendation:** Maintain the current structure for now. Fully normalizing the step *definitions* themselves (name, description, configuration) out of JSONB into a separate SQL table with a one-to-many relationship with `workflows` would be a more significant architectural change. This can be a future enhancement if the JSONB approach proves to have limitations in querying or data integrity for step definitions. The immediate priority is ensuring the assignment/invitation logic works flawlessly with the existing structure.

## 8. Removal of `/auth/register` Route

### 8.1. Identified Issue

The existence of a public registration flow conflicts with the established user flow that all users must be invited.

### 8.2. Recommendation

*   Identify and remove any Next.js page and API route handler associated with `/auth/register`.
*   Remove any UI elements (links, buttons) that might direct users to a public registration page.
*   Ensure all user creation paths go through an invitation mechanism.

## 9. Database Schema Clarifications

### 9.1. `profiles` Table

*   **Finding:** `supabase-schema.sql` confirms `profiles` includes `company` (TEXT) and `job_title` (TEXT). The `create_profile_for_user` trigger populates `profiles` upon `auth.users` insertion.
*   **Recommendation:** This is aligned with user flow requirements for editable profile fields. Ensure that `full_name`, `job_title`, and `company` can be populated via `raw_user_meta_data` during the `supabase.auth.admin.inviteUserByEmail` calls, or are fields the user can complete during the `/auth/complete-invite` frontend flow.

### 9.2. `user_system_roles` Table

*   **Finding:** The `supabase-schema.sql` file **does not** define a `user_system_roles` table. The `docs/database.md` mentions it, but it appears to be outdated or refer to a non-implemented design. Superadmin identification currently relies on `user_metadata.role = 'admin'`.
*   **Recommendation:**
    *   Continue using `user_metadata.role = 'admin'` for Superadmin identification, as this is what `withAdminAuth` currently checks.
    *   The proposed changes to `/api/auth/complete-invite` (Section 2.3) correctly handle setting this metadata for Superadmins.
    *   **Update `docs/database.md`** to remove the entry for `user_system_roles` to reflect the actual schema and avoid future confusion.

## 10. Summary & Next Steps

The most impactful change required is the refactoring of `/api/auth/complete-invite/route.ts`. Addressing this will resolve the core issues with user onboarding and permissioning. Following this, the AI tool brand detection logic and Superadmin seeding should be prioritized.

It is recommended that a senior developer reviews this plan thoroughly before proceeding with implementation. Upon approval, changes can be implemented iteratively, starting with the `complete-invite` route. 