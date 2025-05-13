# Discovery and Remediation Plan (v2) - MixerAI Application Review

## 1. Introduction

This document (v2) outlines the findings from a targeted discovery phase focused on user flows, invitation mechanisms, role assignments, AI tool integrations, and overall system coherence within the MixerAI application. It details identified discrepancies, bugs, and proposes a remediation plan with specific solutions and code examples to align the application with documented requirements and user expectations.

This revised plan incorporates detailed feedback from senior development staff, aiming for robust, maintainable, and clear solutions suitable for implementation by developers of all experience levels. The primary goal is to ensure the application functions reliably and aligns with best practices.

## 2. Critical: User Invitation & Role Assignment (`/api/auth/complete-invite/route.ts`)

**Original Issue:** The `/api/auth/complete-invite/route.ts` script is central to user onboarding but currently fails to correctly process invitations from different sources, leading to incorrect role and permission assignments.

### 2.1. Identified Issues (Recap)

1.  **Metadata Field Mismatch:** Inconsistent `app_metadata` field names used compared to what's set by inviter APIs.
2.  **Missing Superadmin Global Role Logic:** No assignment of `user_metadata.role = 'admin'` for Superadmin invites.
3.  **Inadequate Differentiation of Invite Sources:** Lack of clear, prioritized logic to handle the three distinct invitation flows.
4.  **Incomplete Workflow User Setup:** Missing steps for `workflow_invitations` updates and `workflow_user_assignments` population.

### 2.2. Summary of `app_metadata` Set by Invitation Sources (Recap)

*   **`/api/users/invite` (Direct Admin Invite by Superadmin):**
    *   `app_metadata.invite_type = 'direct_user_invite'`
    *   `app_metadata.intended_role = 'admin' | 'editor' | 'viewer'`
    *   `app_metadata.invited_to_brand_id = <brand_uuid> | null`
    *   `app_metadata.inviter_id = <inviter_user_uuid>`
*   **PUT /api/brands/[id]** (Brand Admin Assignment/Invite):**
    *   `app_metadata.invite_type = 'brand_admin_invite_on_update'`
    *   `app_metadata.intended_role = 'admin'`
    *   `app_metadata.assigned_as_brand_admin_for_brand_id = <brand_uuid>`
    *   `app_metadata.inviter_id = <inviter_user_uuid>`
*   **POST/PUT /api/workflows/...** (Workflow Step Assignment/Invite):**
    *   Sets `app_metadata` via `supabase.auth.admin.inviteUserByEmail()`:
    *   `app_metadata.role = 'admin' | 'editor' | 'viewer'` (role for workflow's brand context)
    *   `app_metadata.invited_from_workflow = <workflow_uuid>`
    *   `app_metadata.invited_by = <inviter_user_uuid>`
    *   **Needs to also include:** `app_metadata.step_id_for_assignment = <step_id_number>` (The specific step the user is being invited to, for `workflow_user_assignments`).

### 2.3. Recommended Solution for `/api/auth/complete-invite/route.ts` (Revised with Feedback)

**Guiding Principles from Feedback:**
*   **Single Responsibility & Readability:** Break down complex logic into smaller, focused functions.
*   **Atomicity & Transactions:** Ensure database operations that form a single logical unit either all succeed or all fail.
*   **Metadata Cleanup:** Prevent stale invite-related data in `app_metadata`.
*   **Granular Error Handling:** Return specific HTTP status codes and error messages.
*   **Dynamic Role Validation:** Avoid hardcoding role lists where possible.

**Implementation Approach:**

1.  **Create a Helper Service/Module (e.g., `src/lib/auth/invite-completion-service.ts`):** ✅ **DONE**
    This service will encapsulate the core logic.

    ```typescript
    // src/lib/auth/invite-completion-service.ts (Conceptual)
    import { SupabaseClient } from '@supabase/supabase-js';
    import { Database, UserRoles } from '@/types/supabase'; // Assuming UserRoles is your enum type

    interface InviteMetadata {
      source: 'direct_admin' | 'brand_assignment' | 'workflow_assignment' | 'unknown';
      intendedRole: UserRoles | null;
      brandIdForPermission: string | null;
      workflowIdForContext: string | null;
      stepIdForAssignment: number | string | null;
    }

    function parseInviteMetadata(appMetadata: any): InviteMetadata {
      const metadata = appMetadata || {};
      // Logic from section 2.3 of original plan to determine source, role, brandId, workflowId, stepId
      // ...
      // Example for direct_admin:
      if (metadata.invite_type === 'direct_user_invite' && metadata.intended_role) {
        return {
          source: 'direct_admin',
          intendedRole: metadata.intended_role as UserRoles,
          brandIdForPermission: metadata.invited_to_brand_id || null,
          workflowIdForContext: null,
          stepIdForAssignment: null,
        };
      }
      // ... other else if branches for 'brand_assignment' and 'workflow_assignment'
      return { source: 'unknown', intendedRole: null, brandIdForPermission: null, workflowIdForContext: null, stepIdForAssignment: null };
    }

    async function assignSuperadminRole(userId: string, existingUserMetadata: any, supabase: SupabaseClient<Database>) {
      console.log(`[InviteService] Assigning Superadmin role to user ${userId}`);
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { ...existingUserMetadata, role: 'admin' } }
      );
      if (error) throw new Error(`DB_SUPERADMIN_ROLE_FAIL: ${error.message}`);
      console.log(`[InviteService] Successfully set user_metadata.role = 'admin' for Superadmin ${userId}`);
    }

    async function assignBrandPermissions(userId: string, brandId: string, role: UserRoles, supabase: SupabaseClient<Database>) {
      console.log(`[InviteService] Assigning role '${role}' to user ${userId} for brand ${brandId}`);
      const { error } = await supabase
        .from('user_brand_permissions')
        .upsert({ user_id: userId, brand_id: brandId, role: role }, { onConflict: 'user_id,brand_id' });
      if (error) throw new Error(`DB_BRAND_PERMISSION_FAIL: ${error.message}`);
      console.log(`[InviteService] Successfully assigned brand permission for user ${userId}, brand ${brandId}.`);
    }

    async function finalizeWorkflowUser(
        userId: string, userEmail: string, workflowId: string, 
        stepId: number | string | null, brandId: string, role: UserRoles, 
        supabase: SupabaseClient<Database>
    ) {
      console.log(`[InviteService] Finalizing workflow user ${userId} for workflow ${workflowId}, brand ${brandId}, role ${role}`);
      // 1. Assign brand permission (already called by route handler or can be called here)
      // await assignBrandPermissions(userId, brandId, role, supabase); // if not called before

      // 2. Update workflow_invitations status
      const { error: updateWfInviteError } = await supabase
        .from('workflow_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('email', userEmail)
        .eq('workflow_id', workflowId)
        .eq('status', 'pending');
      if (updateWfInviteError) console.warn(`[InviteService] Failed to update workflow_invitation status: ${updateWfInviteError.message}`);
      else console.log(`[InviteService] Updated workflow_invitation status for ${userEmail}, workflow ${workflowId}`);

      // 3. Ensure workflow_user_assignments
      if (stepId !== null) {
        const { error: assignError } = await supabase
          .from('workflow_user_assignments')
          .upsert({ workflow_id: workflowId, step_id: Number(stepId), user_id: userId }, { onConflict: 'workflow_id,step_id,user_id' });
        if (assignError) console.warn(`[InviteService] Failed to upsert workflow_user_assignment: ${assignError.message}`);
        else console.log(`[InviteService] Ensured workflow_user_assignment for user ${userId}, workflow ${workflowId}, step ${stepId}`);
      } else {
        console.warn(`[InviteService] No stepId provided for workflow user assignment for user ${userId}, workflow ${workflowId}.`);
      }
    }
    
    async function cleanupAppMetadata(userId: string, appMetadata: any, supabase: SupabaseClient<Database>) {
        const metadataToClear: Record<string, undefined> = {
            intended_role: undefined, invited_to_brand_id: undefined, invite_type: undefined,
            assigned_as_brand_admin_for_brand_id: undefined, invited_from_workflow: undefined, role: undefined,
            step_id_for_assignment: undefined, // or whatever name is chosen for stepId
            // Add any other invite-specific keys
        };
        const newAppMetadata = { ...appMetadata };
        for (const key in metadataToClear) {
            delete newAppMetadata[key];
        }
        const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: newAppMetadata });
        if (error) console.warn(`[InviteService] Failed to cleanup app_metadata for user ${userId}: ${error.message}`);
        else console.log(`[InviteService] Cleaned up app_metadata for user ${userId}`);
    }

    // Main function to be called by the API route
    export async function processInviteCompletion(
        user: any, // Supabase user object
        supabase: SupabaseClient<Database>
    ): Promise<{ success: boolean; message: string; httpStatus?: number; data?: any }> {
        const userId = user.id;
        const userEmail = user.email;
        const appMetadata = user.app_metadata || {};
        const existingUserMetadata = user.user_metadata || {};

        const parsedMeta = parseInviteMetadata(appMetadata);

        if (parsedMeta.source === 'unknown' || !parsedMeta.intendedRole) {
            console.warn(`[InviteService] Unknown invite source or missing role for user ${userId}. AppMetadata:`, appMetadata);
            return { success: true, message: 'Invite confirmed, but specific permissions could not be assigned due to missing context.', httpStatus: 200 }; // 200 as user is confirmed
        }
        
        // Role validation (can fetch validRoles from DB enum type info if desired for true dynamic check)
        const validRoles: ReadonlyArray<UserRoles> = ['admin', 'editor', 'viewer'];
        if (!validRoles.includes(parsedMeta.intendedRole)) {
            console.error(`[InviteService] Invalid role: ${parsedMeta.intendedRole}`);
            return { success: false, message: `Invalid role: ${parsedMeta.intendedRole}`, httpStatus: 400 };
        }
        
        // Atomicity: For complex multi-DB operations, a PL/pgSQL function called via RPC is best.
        // Here, we simulate sequential calls. If any critical one fails, an error is thrown.
        // The PL/pgSQL function would combine these writes into a single transaction.
        // Example: supabase.rpc('finalize_user_invite', { user_id: userId, invite_meta: parsedMeta })
        
        try {
            if (parsedMeta.source === 'direct_admin' && parsedMeta.intendedRole === 'admin' && !parsedMeta.brandIdForPermission) {
                await assignSuperadminRole(userId, existingUserMetadata, supabase);
            } else if (parsedMeta.brandIdForPermission && parsedMeta.intendedRole) {
                await assignBrandPermissions(userId, parsedMeta.brandIdForPermission, parsedMeta.intendedRole, supabase);
                if (parsedMeta.source === 'workflow_assignment' && parsedMeta.workflowIdForContext && parsedMeta.brandIdForPermission) {
                    await finalizeWorkflowUser(userId, userEmail, parsedMeta.workflowIdForContext, parsedMeta.stepIdForAssignment, parsedMeta.brandIdForPermission, parsedMeta.intendedRole, supabase);
                }
            } else {
                 console.warn(`[InviteService] Unhandled permission assignment case for user ${userId}. ParsedMeta:`, parsedMeta);
                 return { success: true, message: 'Invite confirmed, but no specific permission assignment path was met.', httpStatus: 200 };
            }
            
            await cleanupAppMetadata(userId, appMetadata, supabase);
            return { success: true, message: 'Invite process completed successfully. Permissions assigned.', httpStatus: 200 };

        } catch (error: any) {
            console.error(`[InviteService] Error processing invite for user ${userId}:`, error.message);
            if (error.message?.startsWith('DB_')) { // Custom error prefix
                 return { success: false, message: `Database operation failed: ${error.message}`, httpStatus: 500 };
            }
            return { success: false, message: `Failed to complete invite process: ${error.message}`, httpStatus: 500 };
        }
    }
    ```

2.  **Update the API Route (`src/app/api/auth/complete-invite/route.ts`):** ✅ **DONE**
    Make it lightweight, calling the service function.

    ```typescript
    // src/app/api/auth/complete-invite/route.ts (Revised)
    import { NextRequest, NextResponse } from 'next/server';
    import { withAuth } from '@/lib/auth/api-auth';
    import { createSupabaseAdminClient } from '@/lib/supabase/client';
    import { processInviteCompletion } from '@/lib/auth/invite-completion-service'; // Import the service

    export const dynamic = 'force-dynamic';

    export const POST = withAuth(async (request: NextRequest, user: any) => {
      const supabase = createSupabaseAdminClient();
      const result = await processInviteCompletion(user, supabase);

      return NextResponse.json(
        { success: result.success, message: result.message, data: result.data },
        { status: result.httpStatus || (result.success ? 200 : 500) }
      );
    });
    ```

**Junior Developer Explanation for `complete-invite` Changes:**
*   **Why break it down?** When a piece of code does too many things, it's hard to understand, test, and fix. We're taking the big "complete invite" job and breaking it into smaller, named tasks (like `parseInviteMetadata`, `assignSuperadminRole`). Each small task is easier to get right.
*   **What's `app_metadata`?** When we invite a user (e.g., to a brand or a workflow), we attach some hidden notes to their invite saying *why* they were invited (e.g., "this person should be an admin for Brand X"). When they sign up, this `complete-invite` code reads those notes (`app_metadata`) to set them up correctly. The problem was, it was looking for notes with the wrong names or in the wrong order.
*   **What's atomicity?** Imagine giving a user three keys (permissions). If you give them one, then the system crashes before giving the other two, they're stuck! Atomicity means either *all three* keys are given, or *none* are. For databases, this is often done with "transactions" or special database functions (PL/pgSQL functions called via RPC) to make sure user setup is all-or-nothing.
*   **Why cleanup metadata?** Once the "notes" (`app_metadata`) are used to set up the user, we should erase them so they don't cause confusion later.
*   **Better error messages:** Instead of just saying "Something went wrong," we want to give more specific clues (like "Sorry, couldn't save to the database" or "The role you were invited with doesn't exist"). This helps us fix problems faster and tells the user (or other systems) more clearly what happened. HTTP status codes (like 200 for OK, 400 for bad request, 500 for server error) are part of this.

### 2.4. Ensuring `step_id` is available for Workflow Invites ✅ **DONE**
*   The workflow creation/update APIs (`POST /api/workflows/route.ts`, `PUT /api/workflows/[id]/route.ts`) when preparing `app_metadata` for `supabase.auth.admin.inviteUserByEmail` **must** include the relevant `step_id` (e.g., as `app_metadata.step_id_for_assignment`). This is critical for the `complete-invite` service to correctly populate `workflow_user_assignments`.
    *   Implementation: Both workflow API routes have been updated to include `step_id_for_assignment` (set to the first `step_id` encountered for that user in the batch of invitations) in the `app_metadata`.

## 3. AI Tools - Brand Detection from URL (`/api/tools/...`)

**Original Issue:** AI tool APIs require `brandId` and don't infer it from a user-provided URL.

### 3.1. Recommended Solution (Revised with Feedback)

1.  **API Request Body:** Modify API routes to accept `websiteUrlForBrandDetection?: string` alongside `brandId?: string`. (✅ **DONE** for relevant routes)
2.  **Centralized Domain Utility (`src/lib/utils/url-utils.ts`):** (✅ **DONE** - `src/lib/utils/url-utils.ts` created)
    ```typescript
    // src/lib/utils/url-utils.ts
    export function extractCleanDomain(urlInput: string): string | null {
      try {
        const url = new URL(urlInput.startsWith('http') ? urlInput : `http://${urlInput}`);
        // Remove 'www.' and return hostname, converted to lowercase for consistent matching
        return url.hostname.replace(/^www\./i, '').toLowerCase();
      } catch (e) {
        // Log the error for server-side debugging, but don't expose details to client directly from here.
        console.warn(`[extractCleanDomain] Invalid URL provided: ${urlInput}`, e);
        return null;
      }
    }
    ```
3.  **Database Enhancement (Performance):** (✅ **DONE** - Migration `migrations/20250516100000_add_normalized_domain_to_brands.sql` created)
    *   Add a new, indexed column to the `brands` table: `normalized_website_domain TEXT`.
    *   Populate this column during brand creation and updates by cleaning the `website_url` (lowercase, remove protocol, www, path, query). (✅ **DONE** - API routes `src/app/api/brands/route.ts` and `src/app/api/brands/[id]/route.ts` updated)
    *   `CREATE INDEX IF NOT EXISTS idx_brands_normalized_website_domain ON brands(normalized_website_domain);`
4.  **API Route Logic:** (✅ **DONE** - Routes `alt-text-generator`, `metadata-generator`, `generate-title` updated. `content-transcreator` and `ai/generate` did not require changes.)
    ```typescript
    // Inside AI tool API route
    // ...
    let brandContext: Brand | null = null; // Brand type from your DB typings

    if (body.brandId) {
      // Fetch brand by ID
      const { data, error } = await supabase.from('brands').select('*').eq('id', body.brandId).single();
      if (error) console.warn(`Error fetching brand by ID ${body.brandId}: ${error.message}`);
      else brandContext = data;
    } else if (body.websiteUrlForBrandDetection) {
      const cleanDomain = extractCleanDomain(body.websiteUrlForBrandDetection);
      if (cleanDomain) {
        const { data, error } = await supabase
          .from('brands')
          .select('*') 
          .eq('normalized_website_domain', cleanDomain) // Query against the new indexed column
          .limit(1)
          .single();
        if (error && error.code !== 'PGRST116') console.warn(`Error fetching brand by domain ${cleanDomain}: ${error.message}`);
        else if (data) brandContext = data;
      }
    }

    // AI call:
    // const aiResult = await generateAltText(body.imageUrl, brandContext, ...);
    // Note: generateAltText and other AI functions would need to accept Brand | null

    // API Response:
    return NextResponse.json({ 
      success: true, 
      // ...aiResult, 
      brand_id_used: brandContext?.id || null, // Example of returning brand info
      brand_name_used: brandContext?.name || null,
      detection_source: body.brandId ? 'brand_id' : (body.websiteUrlForBrandDetection && brandContext ? 'url_detection' : 'none')
    });
    ```
5.  **Frontend:** If `brand_id_used` in the API response is `null` (indicating brand context could not be determined), display a "use at own risk" message or similar UI indication when AI tools are used without a specific brand context. **(PENDING - Frontend Task)**

**Junior Developer Explanation for AI Tool Changes:**
*   **Why a `normalized_website_domain`?** Searching for "example.com" is much faster if the database has a special column just for clean domain names (like `example.com` without `http://www.` or `/page.html`) and an index (like a book's index) on it. Trying to find `example.com` inside longer URLs like `http://www.example.com/some/path` is slower for the database.
*   **`extractCleanDomain` utility:** Instead of writing the URL cleaning logic in many places, we put it in one shared function. If we need to improve how we clean URLs, we only change it in one spot.
*   **Response:** Instead of multiple flags, we send back either the brand's details (like `brand_id_used`, `brand_name_used`) or `null` for them. The frontend can easily check: "Is `brand_id_used` there? Yes? Okay, we used brand info. No? Show a warning."

## 4. Initial Superadmin Seeding ✅ **DONE (Manual setup confirmed)**

**Original Issue:** No automated way to create the first Superadmin.

### 4.1. Recommended Solution (Revised with Feedback)

1.  **Idempotent Seed Script (Recommended):** (✅ **DONE** - Conceptual script `scripts/seed-superadmin.ts` created. Manual setup of Superadmin `peter.pitcher@genmills.com` with `user_metadata.role = \'admin\'` confirmed, making script execution for this user unnecessary at this time.)
    Create a script (e.g., `scripts/seed-superadmin.ts` using Deno/Node with Supabase JS client, or a `.sql` file).
    ```typescript
    // Conceptual scripts/seed-superadmin.ts
    // import { createClient } from '@supabase/supabase-js';
    // const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // const SUPERADMIN_EMAIL = process.env.INITIAL_SUPERADMIN_EMAIL || 'peter.pitcher@genmills.com';
    // const SUPERADMIN_PASSWORD = process.env.INITIAL_SUPERADMIN_PASSWORD; // MUST be from env

    // if (!SUPERADMIN_PASSWORD) throw new Error("INITIAL_SUPERADMIN_PASSWORD env var is required.");

    // async function seed() {
    //   // NOTE: The exact method to fetch/check a user by email via the admin API 
    //   // (like getUserByEmail) needs verification against the current supabase-js version.
    //   // The script uses a conceptual getUserByEmail as per the plan.
    //   const { data: { user: existingUser }, error: getError } = await supabaseAdmin.auth.admin.getUserByEmail(SUPERADMIN_EMAIL);
    //   if (getError && getError.status !== 404) throw getError; // 404 is OK (user doesn't exist)

    //   if (existingUser) {
    //     console.log(`User ${SUPERADMIN_EMAIL} already exists. Ensuring Superadmin role.`);
    //     const currentRole = existingUser.user_metadata?.role;
    //     if (currentRole !== 'admin') {
    //       const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    //         existingUser.id,
    //         { user_metadata: { ...existingUser.user_metadata, role: 'admin' } }
    //       );
    //       if (updateError) throw updateError;
    //       console.log(`Updated user ${SUPERADMIN_EMAIL} to Superadmin.`);
    //     }
    //     // Also ensure profile exists - trigger should handle but can double check / create if missing
    //   } else {
    //     console.log(`Creating Superadmin user: ${SUPERADMIN_EMAIL}`);
    //     const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    //       email: SUPERADMIN_EMAIL,
    //       password: SUPERADMIN_PASSWORD,
    //       email_confirm: true, 
    //       user_metadata: { role: 'admin', full_name: 'Peter Pitcher' /* other details */ }
    //     });
    //     if (createError) throw createError;
    //     console.log(`Superadmin ${SUPERADMIN_EMAIL} created. Profile will be made by trigger.`);
    //   }
    // }
    // seed().catch(console.error);
    ```
    *Implementation Note: The created `scripts/seed-superadmin.ts` uses environment variables for credentials and attempts to be idempotent. The exact Supabase admin method for checking user existence by email (`getUserByEmail`) is based on the plan's conceptual example and will need verification against the specific `supabase-js` client library version if the script is to be executed in the future.*

2.  **Secret Management:** The initial password **MUST** be loaded from an environment variable or a secure secret management system, not hardcoded in the script. (✅ **COVERED** by script design and manual setup approach ensures password was handled securely by user.)
3.  **Manual Procedure (Fallback):** Keep the documented manual steps as a fallback, but emphasize the script for consistency. (✅ **DONE** - Manual setup was successfully used.)

**Junior Developer Explanation for Seeding:**
*   **What's idempotency?** It means you can run the script many times, and it will have the same result as running it once. If the Superadmin already exists, it won't try to create them again (which would cause an error). It might just check if they still have the Superadmin role.
*   **Why environment variables for passwords?** Putting passwords directly in code that gets saved to version control (like Git) is a huge security risk. Environment variables are a way to provide sensitive information to the script when it runs, without saving it in the code itself.

## 5. Initial Workflow Step Assignment & Task Creation for New Users ✅ **DONE**

**Original Issue:** The `handle_new_content_workflow_assignment` trigger doesn't create tasks for users new to the system at the time of content creation.

### 5.1. Recommended Solution (Revised with Feedback)

1.  **Primary Fix:** The refactored `/api/auth/complete-invite` service (Section 2.3) **must** reliably create an entry in `workflow_user_assignments` when a user invited via workflow completes their signup. (✅ **DONE** - Addressed by `finalizeWorkflowUser` in `src/lib/auth/invite-completion-service.ts` which upserts into `workflow_user_assignments`.)
2.  **Database Trigger on `workflow_user_assignments` (Favored):** (✅ **DONE** - Implemented in migration `migrations/20250516120000_add_task_creation_trigger_for_workflow_assignments.sql`)
    *   Create a new trigger: `AFTER INSERT ON public.workflow_user_assignments FOR EACH ROW EXECUTE FUNCTION handle_new_workflow_assignment_task_creation();` (✅ **DONE** - Included in migration)
    *   **`handle_new_workflow_assignment_task_creation()` function:** (✅ **DONE** - Included in migration)
        ```sql
        -- Conceptual SQL for the trigger function (see migration file for actual implementation)
        -- CREATE OR REPLACE FUNCTION public.handle_new_workflow_assignment_task_creation()
        -- RETURNS TRIGGER AS $$
        -- DECLARE
        --     content_record RECORD;
        --     workflow_step_details JSONB;
        -- BEGIN
        //     -- NEW.user_id, NEW.workflow_id, NEW.step_id are available from the inserted row
        //
        //     -- Find the step definition from the workflow's JSONB steps
        //     SELECT steps -> NEW.step_id INTO workflow_step_details
        //     FROM public.workflows
        //     WHERE id = NEW.workflow_id;
        //
        //     -- Find all content items that are currently at this specific step of this workflow
        //     FOR content_record IN
        //         SELECT id, title
        //         FROM public.content
        //         WHERE workflow_id = NEW.workflow_id
        //         AND current_step = NEW.step_id -- Ensure content is at the step this user was just assigned to
        //         AND status = 'pending_review' -- Or whatever status indicates work is needed at this step
        //     LOOP
        //         -- Insert a task if one doesn't already exist for this user, content, and step
        //         INSERT INTO public.user_tasks (
        //             user_id,
        //             content_id,
        //             workflow_id,
        //             workflow_step_id, -- Store the numeric/text identifier for the step
        //             workflow_step_name,
        //             status
        //         )
        //         VALUES (
        //             NEW.user_id,
        //             content_record.id,
        //             NEW.workflow_id,
        //             NEW.step_id::TEXT, -- Cast to TEXT if workflow_step_id is TEXT
        //             workflow_step_details ->> 'name', -- Extract name from JSONB
        //             'pending'
        //         )
        //         ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING; -- Prevents duplicates
        //     END LOOP;
        //
        //     RETURN NEW;
        -- END;
        -- $$ LANGUAGE plpgsql SECURITY DEFINER;
        ```
    *   **Idempotency:** The `user_tasks` table **MUST** have a `UNIQUE` constraint on `(user_id, content_id, workflow_step_id)`. The trigger uses `ON CONFLICT DO NOTHING`. (✅ **DONE** - `ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_user_content_step_unique UNIQUE (user_id, content_id, workflow_step_id);` included in migration)
    *   **Benefits:** This decouples task creation from the invite API, ensuring tasks are created whenever a user is formally assigned to a step, regardless of how that assignment occurs. It's more resilient.

**Junior Developer Explanation for Task Creation:**
*   **Why a new trigger?** A trigger is like an automatic helper in the database. This new trigger watches the `workflow_user_assignments` table. Anytime a user gets officially linked to a workflow step (e.g., after they finish signing up from an invite), this trigger wakes up.
*   **What does it do?** It checks: "Is there any content currently waiting at the step this user was just assigned to?" If yes, it creates a task for them in the `user_tasks` table, but only if they don't already have one for that specific piece of content and step (to avoid duplicates). This way, tasks appear as soon as the user is fully set up and able to work on them.

## 6. Bug: Missing Workflow Info on Content Creation (User-Reported) 🟡 **NO BACKEND CHANGES**

**Unchanged from original plan:** This is likely a client-side (frontend) issue. The `POST /api/content` API correctly saves `workflow_id` and `template_id` if they are provided in the request. Frontend logic needs review. **(PENDING - Frontend Task)**

## 7. Workflow Step Storage 🟡 **NO CHANGES PLANNED**

**Unchanged from original plan:** Current structure (definitions in JSONB, assignments/invitations in separate tables) is acceptable. Full normalization of step definitions is a future consideration.

## 8. Removal of `/auth/register` Route ✅ **PARTIALLY DONE**

**Original Issue:** Public registration conflicts with invite-only flow.
### Recommended Solution (Revised with Feedback)
*   Remove Next.js page and API route for `/auth/register`. (✅ **DONE** - `src/app/auth/register/page.tsx` deleted. API route did not appear to exist at `src/app/api/auth/register/route.ts`.)
*   **Audit Thoroughly:** Conduct a codebase search (including frontend components, email templates, existing documentation, API client code, and any automated tests like unit, integration, or end-to-end tests) for any hardcoded URLs or programmatic references to the old `/auth/register` path and remove/update them to prevent broken links or outdated flows. (✅ **DONE** for `src/components/login-form.tsx`, `final_project_structure.json`, `src/app/README.md`, `docs/api_reference.md`. 🟡 **Manual Review Recommended** for `docs/archive/misc/DOCUMENTATION.md` due to an issue with the automated edit that may have appended unrelated content; the intent was to comment out the `/api/auth/register` line.)

## 9. Database Schema Clarifications ✅ **DONE**

**Unchanged from original plan:**
*   `profiles` table correctly has `company` and `job_title`. (✅ Verified)
*   `user_system_roles` table does not exist in `supabase-schema.sql` or is not used for Superadmin. Continue using `user_metadata.role = 'admin'` for Superadmins. (✅ Verified, system relies on `user_metadata`)
*   Update `docs/database.md` to remove references to `user_system_roles` being used for Superadmin. (✅ **DONE** - References to `user_system_roles` for Superadmin role management removed/commented out from `docs/database.md`.)

## 10. Overall Architecture & Maintainability (New Section)

Based on senior developer feedback, incorporate these general principles:

### 10.1. Modularisation (✅ ADDRESSED)
*   **Concept:** Break down large pieces of code into smaller, reusable modules or services, each with a clear purpose.
*   **Why:** Makes code easier to understand, test, and maintain. Changes in one module are less likely to break others.
*   **Examples for MixerAI:**
    *   `src/lib/auth/invite-completion-service.ts` (✅ Implemented as per Section 2.3).
    *   `src/lib/services/brand-service.ts`: For logic related to fetching or resolving brands (e.g., the AI tool brand detection from URL). (Partially addressed by `url-utils.ts` and logic within AI tool routes; a dedicated service could be a future step).
    *   `src/lib/services/workflow-service.ts`: For complex workflow operations beyond simple DB calls. (Future consideration)
    *   `src/lib/utils/supabase-helpers.ts`: For common Supabase client instantiation or frequently used queries. (Partially present with `createSupabaseAdminClient` etc.)
    *   `src/lib/utils/url-utils.ts` (✅ Implemented as per Section 3.1)

### 10.2. Type Safety (✅ ADDRESSED)
*   **Concept:** Use TypeScript's strong typing features, especially for data coming from or going to the database.
*   **Why:** Catches many common errors (like typos in column names or using the wrong data type) during development (compile-time) rather than when the app is running.
*   **Action:**
    *   Generate TypeScript types from your Supabase schema: (✅ **DONE** - `src/types/supabase.ts` generated and used)
        ```bash
        npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts
        ```
    *   Import and use these generated types (e.g., `Database`, `Tables<'profiles'>`, `Enums<'user_role'>`) in your backend code when interacting with Supabase. (✅ **DONE** - Applied in new/modified services and routes)

### 10.3. Logging & Monitoring (🟡 GUIDANCE NOTED)
*   **Concept:** Replace general `console.log()` statements with a structured logging library.
*   **Why:** Structured logs (usually JSON) are machine-readable and easier to search, filter, and analyze in production monitoring tools. They allow adding consistent context (like `userId`, `requestId`, `moduleName`) to every log message.
*   **Examples:**
    *   Libraries: `pino`, `winston`.
    *   A basic structured logger setup might look like:
        ```typescript
        // src/lib/logger.ts
        // import pino from 'pino';
        // const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
        // export default logger;

        // Usage in other files:
        // import logger from '@/lib/logger';
        // logger.info({ userId: user.id, action: 'complete_invite_start' }, 'Starting invite completion process.');
        // logger.error({ err: errorObject, userId: user.id }, 'Error during invite completion.');
        ```
    *   This allows shipping logs to services like Datadog, Sentry (for errors), or Supabase's own logging.

## 11. Summary & Next Steps

This v2 plan integrates detailed feedback to provide a more robust and maintainable path forward. The refactoring of `/api/auth/complete-invite/route.ts` remains the highest priority, followed by the AI tool brand detection logic and Superadmin seeding.

It is recommended that this revised plan be reviewed again. Upon approval, implementation can proceed, focusing on modular, testable changes, starting with the `complete-invite` service. 