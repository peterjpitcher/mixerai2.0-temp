// Import the uuid package for generating unique workflow invitation tokens
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
// import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api-utils'; // Added for using in catch blocks
// import { verifyEmailTemplates } from '@/lib/auth/email-templates'; // Added for sending invites
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf'; // Import withAuth
import {
  BrandPermissionVerificationError,
  isPlatformAdminUser,
  requireBrandAccess,
  requireBrandAdminAccess,
} from '@/lib/auth/brand-access';
import type { User } from '@supabase/supabase-js';
import type { Json } from '@/types/supabase';
// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define types for the workflow invitation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface WorkflowInvitation {
  workflow_id: string;
  step_id: number;
  email: string;
  role: string;
  invite_token: string;
  expires_at: string;
  status?: string;
}

// Define types for workflow steps and assignees
interface WorkflowAssignee {
  id?: string;
  email: string;
  name?: string;
  invitation_status?: string;
}

interface WorkflowStep {
  id: string; // Changed to string to support UUIDs
  name: string;
  description: string;
  role: string;
  approvalRequired?: boolean;
  assignees: WorkflowAssignee[];
  formRequirements?: Record<string, unknown> | null;
}

/**
 * GET endpoint to retrieve a specific workflow by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const workflowId = params.id;
    
    const { data: workflowData, error: workflowErrorData } = await supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name, brand_color, logo_url),
        content_templates:template_id(name)
      `)
      .eq('id', workflowId)
      .single();
    
    if (workflowErrorData) {
      if (workflowErrorData.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 404 }
        );
      }
      console.error(`Error fetching workflow ${workflowId}:`, workflowErrorData);
      throw workflowErrorData;
    }

    // Permission Check
    const isGlobalAdmin = isPlatformAdminUser(user);
    if (!isGlobalAdmin) {
      if (!workflowData || !workflowData.brand_id) {
        console.error(`[API Workflows GET /${workflowId}] Workflow data or brand_id missing for permission check.`);
        return NextResponse.json({ success: false, error: 'Internal server error during permission check.' }, { status: 500 });
      }

      try {
        await requireBrandAccess(supabase, user, workflowData.brand_id);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You do not have permission to access this workflow\'s brand.' },
            { status: 403 }
          );
        }
        throw error;
      }
    }
    // If global admin or has permission for the workflow's brand, proceed.
    
    // Fetch actual steps from workflow_steps table
    const { data: dbSteps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, name, description, role, approval_required, assigned_user_ids, step_order, form_requirements')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true });

    if (stepsError) {
      console.error(`Error fetching steps for workflow ${workflowId}:`, stepsError);
      throw stepsError; 
    }

    let processedSteps: WorkflowStep[] = [];
    if (dbSteps && dbSteps.length > 0) {
      const allUserIds = new Set<string>();
      dbSteps.forEach(step => {
        if (step.assigned_user_ids && Array.isArray(step.assigned_user_ids)) {
          step.assigned_user_ids.forEach((userId: string | null) => { // Iterate over string | null
            if (userId) allUserIds.add(userId);
          });
        }
      });

      const userProfilesMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
      if (allUserIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', Array.from(allUserIds));

        if (profilesError) {
          console.warn(`Error fetching profiles for assignees of workflow ${workflowId}:`, profilesError.message);
          // Continue, assignees might not have full names/emails populated
        } else if (profilesData) {
          profilesData.forEach(p => userProfilesMap.set(p.id, {id: p.id, email: p.email, full_name: p.full_name}));
        }
      }

      processedSteps = dbSteps.map(step => {
        const { form_requirements, ...restStep } = step as typeof step & { form_requirements?: Record<string, unknown> | null };
        let currentStepAssignees: WorkflowAssignee[] = [];
        if (step.assigned_user_ids && Array.isArray(step.assigned_user_ids)) {
          currentStepAssignees = step.assigned_user_ids.map((userId: string | null) => { // Iterate over string | null
            if (!userId) return null; // Skip null user IDs
            const profile = userProfilesMap.get(userId);
            return {
              id: userId,
              email: profile?.email || 'N/A', // Provide a fallback
              name: profile?.full_name || 'N/A'  // Provide a fallback
            };
          }).filter(assignee => assignee !== null) as WorkflowAssignee[]; // Filter out any nulls from skipped user IDs
        }
        return {
          id: restStep.id, // Keep ID as string (UUID)
          name: restStep.name,
          description: restStep.description || '', // Provide empty string if null
          role: restStep.role || '', // Provide empty string if null
          approvalRequired: restStep.approval_required ?? undefined, // Convert null to undefined
          assignees: currentStepAssignees,
          formRequirements: form_requirements && typeof form_requirements === 'object' ? form_requirements : null
        };
      });
    }

    const { count: contentCount, error: contentCountError } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId);

    if (contentCountError) {
      console.warn(`Failed to compute content usage count for workflow ${workflowId}:`, contentCountError.message);
    }
    
    const formattedWorkflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: (workflowData as Record<string, unknown>).description || null, // Cast to Record for these potentially untyped fields
      brand_id: workflowData.brand_id,
      brand_name: workflowData.brands?.name || null,
      brand_color: workflowData.brands?.brand_color || null,
      brand_logo_url: workflowData.brands?.logo_url || null,
      template_id: (workflowData as Record<string, unknown>).template_id || null, 
      status: (workflowData as Record<string, unknown>).status || null, 
      steps: processedSteps, 
      steps_count: processedSteps.length,
      template_name: workflowData.content_templates?.name || null,
      created_at: workflowData.created_at,
      updated_at: workflowData.updated_at,
      created_by: (workflowData as Record<string, unknown>).created_by || null,
      content_count: typeof contentCount === 'number' ? contentCount : 0
    };

    return NextResponse.json({ 
      success: true, 
      workflow: formattedWorkflow 
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch workflow');
  }
});

/**
 * PUT endpoint to update a specific workflow
 */
export const PUT = withAuthAndCSRF(async (
  request: NextRequest,
  user: User, // The authenticated user object from withAuth
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const workflowId = params.id;
    const body = await request.json();

    // Permission Check
    const isGlobalAdmin = isPlatformAdminUser(user);
    const { data: workflowForPermCheck, error: fetchPermError } = await supabase
      .from('workflows')
      .select('brand_id')
      .eq('id', workflowId)
      .single();

    if (fetchPermError || !workflowForPermCheck) {
      console.error(`[API Workflows PUT /${workflowId}] Error fetching workflow for permission check or workflow not found:`, fetchPermError);
      return NextResponse.json({ success: false, error: 'Workflow not found or error fetching for permissions.' }, { status: 404 });
    }

    const currentBrandId: string | null = workflowForPermCheck.brand_id;

    if (!isGlobalAdmin) {
      if (!currentBrandId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Workflow not associated with a brand cannot be edited by non-global admin.' },
          { status: 403 }
        );
      }

      try {
        await requireBrandAdminAccess(supabase, user, currentBrandId);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ADMIN_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You do not have admin permission for this workflow\'s brand to update it.' },
            { status: 403 }
          );
        }
        throw error;
      }

      if (typeof body.brand_id === 'string' && body.brand_id !== currentBrandId) {
        try {
          await requireBrandAdminAccess(supabase, user, body.brand_id);
        } catch (error) {
          if (error instanceof BrandPermissionVerificationError) {
            return NextResponse.json(
              { success: false, error: 'Unable to verify target brand permissions at this time.' },
              { status: 500 }
            );
          }
          if (error instanceof Error && error.message === 'NO_BRAND_ADMIN_ACCESS') {
            return NextResponse.json(
              { success: false, error: 'Forbidden: You must be an admin of the selected brand to reassign the workflow.' },
              { status: 403 }
            );
          }
          throw error;
        }
      }

      if (body.brand_id === null) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Removing the brand from a workflow requires platform admin privileges.' },
          { status: 403 }
        );
      }
    }
    // If global admin or authorized brand admin, proceed.
    
    let workflowDescriptionToUpdate: string | undefined = undefined;

    // --- AI Description Generation on Update (if relevant fields change) ---
    // We only regenerate the description if name, brand_id, template_id, or steps are changing,
    // as these are the inputs to the description generation.
    const shouldRegenerateDescription = body.name !== undefined || 
                                    body.brand_id !== undefined || 
                                    body.template_id !== undefined || 
                                    body.steps !== undefined;

    if (shouldRegenerateDescription) {
      try {
        // Fetch current workflow details to get all necessary data for description generation
        const { data: currentWorkflowData, error: fetchError } = await supabase
          .from('workflows')
          .select('name, brand_id, template_id, steps, brands:brand_id(name), content_templates:template_id(name)')
          .eq('id', workflowId)
          .single();

        if (fetchError) {
          console.warn('Could not fetch current workflow data for AI description regeneration:', fetchError.message);
        } else if (currentWorkflowData) {
          const wfName = body.name || currentWorkflowData.name;
          // const brandIdForDesc = body.brand_id || currentWorkflowData.brand_id;
          // const templateIdForDesc = body.template_id !== undefined ? body.template_id : currentWorkflowData.template_id;
          const stepsForDesc = body.steps || currentWorkflowData.steps || [];

          let brandNameForDesc = (currentWorkflowData.brands as Record<string, unknown>)?.name as string;
          if (body.brand_id && body.brand_id !== currentWorkflowData.brand_id) {
            const { data: brandData } = await supabase.from('brands').select('name').eq('id', body.brand_id).single();
            brandNameForDesc = brandData?.name || '';
          }

          let resolvedTemplateNameForDesc: string | null | undefined = (currentWorkflowData.content_templates as Record<string, unknown>)?.name as string;
          if (body.template_id !== undefined && body.template_id !== currentWorkflowData.template_id) {
             if (body.template_id === null) { // template is being removed
                resolvedTemplateNameForDesc = null;
             } else {
                const { data: templateData } = await supabase.from('content_templates').select('name').eq('id', body.template_id).single();
                resolvedTemplateNameForDesc = templateData?.name;
             }
          }

          const stepNamesForDesc = (Array.isArray(stepsForDesc) ? stepsForDesc.map((step: Record<string, unknown>) => step.name) : []).filter(Boolean);
          
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const aiDescriptionResponse = await fetch(`${baseUrl}/api/ai/generate-workflow-description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowName: wfName,
              brandName: brandNameForDesc,
              templateName: resolvedTemplateNameForDesc,
              stepNames: stepNamesForDesc,
            }),
          });

          if (aiDescriptionResponse.ok) {
            const aiData = await aiDescriptionResponse.json();
            if (aiData.success && aiData.description) {
              workflowDescriptionToUpdate = aiData.description;
            }
          } else {
            console.warn('Failed to regenerate AI description on update.');
          }
        }
      } catch (aiError) {
        console.warn('Error calling AI description regeneration service during update:', aiError);
      }
    }
    // --- End AI Description Generation ---

    // Validate template_id is provided
    if (body.template_id === null || body.template_id === undefined) {
      return NextResponse.json(
        { success: false, error: 'Content template is required' },
        { status: 400 }
      );
    }
    
    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    const stepsFromClient = Array.isArray(body.steps) ? body.steps : [];

    if (stepsFromClient.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one workflow step is required.' },
        { status: 400 }
      );
    }
    
    // Validate that each step has at least one assignee
    for (let i = 0; i < stepsFromClient.length; i++) {
      const step = stepsFromClient[i];
      if (!step || typeof step !== 'object') {
        return NextResponse.json(
          { success: false, error: `Invalid step data at position ${i + 1}` },
          { status: 400 }
        );
      }
      if (!step.name || typeof step.name !== 'string' || !step.name.trim()) {
        return NextResponse.json(
          { success: false, error: `Step ${i + 1} must have a name.` },
          { status: 400 }
        );
      }
      if (!step.role || typeof step.role !== 'string' || !step.role.trim()) {
        return NextResponse.json(
          { success: false, error: `Step "${step.name}" must have an assigned role.` },
          { status: 400 }
        );
      }
      if (!step.assignees || !Array.isArray(step.assignees) || step.assignees.length === 0) {
        return NextResponse.json(
          { success: false, error: `Step "${step.name || `Step ${i + 1}`}" must have at least one assignee` },
          { status: 400 }
        );
      }
    }
    
    const brandIdForUpdate: string | null =
      body.brand_id === undefined ? (currentBrandId ?? null) : body.brand_id;

    const processedStepsForRpc: Record<string, unknown>[] = [];
    const formRequirementsByOrder = new Map<number, Record<string, unknown>>();
    
    // Ensure step_order is present, using array index as a fallback
    for (let i = 0; i < stepsFromClient.length; i++) {
      const step = stepsFromClient[i];
      const validAssigneesForStep: { id: string; email?: string; name?: string }[] = [];
      
      if (step.assignees && Array.isArray(step.assignees)) {
        for (const assignee of step.assignees) {
          let userIdToAssign: string | null = null;

          if (assignee.id && !assignee.id.startsWith('temp-')) {
            userIdToAssign = assignee.id;
          } else if (assignee.email) {
            const normalizedEmail = assignee.email.trim().toLowerCase();
            // console.log(`Attempting to find user by normalized email: '${normalizedEmail}' (original: '${assignee.email}') for step '${step.name}'`);
            const { data: existingUser } = await supabase
              .from('profiles') 
              .select('id')
              .eq('email', normalizedEmail)
              .maybeSingle();
            
            if (existingUser) {
              userIdToAssign = existingUser.id;
            } else {
              console.warn(`Assignee with email ${assignee.email} not found for step '${step.name}'. Skipping, as auto-invitation is disabled.`);
            }
          } else {
            console.warn('Skipping assignee without a valid ID or email for step:', step.name, assignee);
          }

          if (userIdToAssign) {
            validAssigneesForStep.push({ 
              id: userIdToAssign,
              email: assignee.email,
              name: assignee.name 
            });
          }
        }
      }
      
      const rawFormRequirements = step.form_requirements && typeof step.form_requirements === 'object'
        ? { ...step.form_requirements }
        : step.formRequirements && typeof step.formRequirements === 'object'
          ? { ...step.formRequirements }
          : {};
      const shouldRequirePublishedUrl = Boolean(step.requiresPublishedUrl ?? rawFormRequirements.requiresPublishedUrl);
      if (shouldRequirePublishedUrl) {
        rawFormRequirements.requiresPublishedUrl = true;
      } else if ('requiresPublishedUrl' in rawFormRequirements) {
        delete (rawFormRequirements as { requiresPublishedUrl?: unknown }).requiresPublishedUrl;
      }

      const stepOrder = (typeof step.step_order === 'number' && Number.isInteger(step.step_order)) ? step.step_order : i + 1;
      formRequirementsByOrder.set(stepOrder, rawFormRequirements);

      processedStepsForRpc.push({
        id: step.id,
        name: step.name,
        description: step.description,
        role: step.role,
        approvalRequired: step.approvalRequired,
        assignees: validAssigneesForStep.map(a => a.id),
        // Ensure step_order is an integer; use index + 1 as fallback if not provided or invalid
        step_order: stepOrder
      });
    }

    // Since we are not inviting new users, p_new_invitation_items is always null
    const newInvitationItemsForRpc = null;

    const descriptionToUse = body.description ?? workflowDescriptionToUpdate ?? undefined;

    const paramsToPass: Record<string, unknown> = {
      p_workflow_id: workflowId,
      p_steps: processedStepsForRpc as unknown as Json,
      p_new_invitation_items: newInvitationItemsForRpc as unknown as Json,
    };

    if (typeof body.name === 'string') {
      paramsToPass.p_name = body.name;
    }

    if (brandIdForUpdate) {
      paramsToPass.p_brand_id = brandIdForUpdate;
    }

    if (body.template_id) {
      paramsToPass.p_template_id = body.template_id;
    }

    if (typeof descriptionToUse === 'string') {
      paramsToPass.p_description = descriptionToUse;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        'Calling RPC update_workflow_and_handle_invites with params:',
        JSON.stringify(paramsToPass, null, 2)
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'update_workflow_and_handle_invites',
      paramsToPass as never
    );

    // Enhanced logging for RPC response
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `[API Workflows PUT /${workflowId}] RPC Response - rpcData:`,
        JSON.stringify(rpcData, null, 2)
      );
      console.debug(
        `[API Workflows PUT /${workflowId}] RPC Response - rpcError:`,
        JSON.stringify(rpcError, null, 2)
      );
    }

    if (rpcError) {
      console.error(`[API Workflows PUT /${workflowId}] Error calling RPC update_workflow_and_handle_invites:`, rpcError);
      // Consider if rpcData also indicates failure e.g. if rpcData === false
      return handleApiError(rpcError, `RPC update_workflow_and_handle_invites failed for workflow ${workflowId}`);
    }

    // Additionally, if your RPC is designed to return `false` on logical failure (handled exception):
    if (rpcData === false) {
      console.error(`[API Workflows PUT /${workflowId}] RPC update_workflow_and_handle_invites returned false, indicating a handled error within the RPC.`);
      
      // Try to get more information about the error
      console.error('Full RPC response:', { rpcData, rpcError });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workflow update failed. Please check the workflow data and try again.'
        },
        { status: 500 } 
      );
    }

    // Update form requirements for each step after successful RPC execution
    if (formRequirementsByOrder.size > 0) {
      const { data: updatedWorkflowSteps, error: fetchUpdatedStepsError } = await supabase
        .from('workflow_steps')
        .select('id, step_order')
        .eq('workflow_id', workflowId);

      if (fetchUpdatedStepsError) {
        console.error(`[API Workflows PUT /${workflowId}] Failed to fetch workflow steps for form requirement updates:`, fetchUpdatedStepsError);
      } else if (updatedWorkflowSteps && updatedWorkflowSteps.length > 0) {
        const updatePromises = updatedWorkflowSteps
          .filter((stepRow) => formRequirementsByOrder.has(stepRow.step_order))
          .map(async (stepRow, idx) => {
            const requirements = formRequirementsByOrder.get(stepRow.step_order)!;
            const normalizedRequirements = (Object.keys(requirements).length > 0 ? requirements : {}) as Json;
            const { error: updateError } = await supabase
              .from('workflow_steps')
              .update({ form_requirements: normalizedRequirements })
              .eq('id', stepRow.id);

            if (updateError) {
              console.error(
                `[API Workflows PUT /${workflowId}] Failed to update form requirements for step (index ${idx}):`,
                updateError
              );
            }
          });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }
    }

    const { data: finalWorkflowData, error: finalFetchError } = await supabase
      .from('workflows')
      .select(`
        *,
        description,
        brands!inner(name, brand_color),
        content_templates!left(name)
      `)
      .eq('id', workflowId)
      .single();

    if (finalFetchError) {
        return handleApiError(finalFetchError, 'Failed to refetch workflow after update, but update may have succeeded');
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: finalWorkflowData 
    });

  } catch (error: unknown) {
    // General error catching for unexpected issues before or after RPC
    console.error('General error in PUT /api/workflows/[id]:', error);
    return handleApiError(error, 'Error updating workflow');
  }
});

/**
 * DELETE endpoint to remove a specific workflow
 */
export const DELETE = withAuthAndCSRF(async (
  _request: NextRequest,
  user: User, // The authenticated user object from withAuth
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const workflowId = params.id;

    // Permission Check (similar to PUT)
    const isGlobalAdmin = isPlatformAdminUser(user);
    const { data: workflowForPermCheck, error: fetchPermError } = await supabase
      .from('workflows')
      .select('brand_id')
      .eq('id', workflowId)
      .single();

    if (fetchPermError || !workflowForPermCheck) {
      return NextResponse.json({ success: false, error: 'Workflow not found or error fetching for permissions.' }, { status: 404 });
    }

    const currentBrandId: string | null = workflowForPermCheck.brand_id;

    if (!isGlobalAdmin) {
      if (!currentBrandId) {
        return NextResponse.json({ success: false, error: 'Forbidden: Workflow not associated with a brand.' }, { status: 403 });
      }

      try {
        await requireBrandAdminAccess(supabase, user, currentBrandId);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ADMIN_ACCESS') {
          return NextResponse.json({ success: false, error: 'Forbidden: You do not have admin permission for this workflow\'s brand to delete it.' }, { status: 403 });
        }
        throw error;
      }
    }
    // If global admin or authorized brand admin, proceed with delete

    // Check for pending content before deletion
    const { data: pendingContent, error: checkError } = await supabase
      .from('content')
      .select('id, title, status')
      .eq('workflow_id', workflowId)
      .in('status', ['pending_review', 'approved'])
      .limit(10);

    if (checkError) {
      return handleApiError(checkError, 'Error checking pending content');
    }

    if (pendingContent && pendingContent.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete workflow with pending content. Please complete or cancel all reviews first.',
          pendingCount: pendingContent.length,
          pendingItems: pendingContent.map(item => ({ id: item.id, title: item.title }))
        },
        { status: 400 }
      );
    }

    // Check for active tasks
    const { data: activeTasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('status', 'pending')
      .limit(1);

    if (tasksError) {
      console.error('Error checking active tasks:', tasksError);
    }

    if (activeTasks && activeTasks.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete workflow with active tasks. Please complete all tasks first.'
        },
        { status: 400 }
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_workflow_and_dependents', {
      p_workflow_id: workflowId,
    });

    if (rpcError) {
      return handleApiError(rpcError, 'Failed to delete workflow');
    }

    if (!rpcResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow could not be deleted because it no longer exists.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow and associated steps/invitations deleted successfully' 
    });
  } catch (error) {
    return handleApiError(error, 'Failed to delete workflow');
  }
}); 
