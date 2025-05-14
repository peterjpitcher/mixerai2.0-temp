// Import the uuid package for generating unique workflow invitation tokens
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api-utils'; // Added for using in catch blocks
import { verifyEmailTemplates } from '@/lib/auth/email-templates'; // Added for sending invites
import { withAuth } from '@/lib/auth/api-auth'; // Import withAuth
// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define types for the workflow invitation
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
  id: number;
  name: string;
  description: string;
  role: string;
  approvalRequired?: boolean;
  assignees?: WorkflowAssignee[];
}

/**
 * GET endpoint to retrieve a specific workflow by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: any, // Added user parameter from withAuth
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const workflowId = params.id; // Renamed id to workflowId for clarity
    
    const { data: workflowData, error: workflowErrorData } = await supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name, brand_color),
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
    
    // Fetch actual steps from workflow_steps table
    const { data: dbSteps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, name, description, role, approval_required, assigned_user_ids, step_order')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true });

    if (stepsError) {
      console.error(`Error fetching steps for workflow ${workflowId}:`, stepsError);
      throw stepsError; 
    }

    let processedSteps: any[] = [];
    if (dbSteps && dbSteps.length > 0) {
      const allUserIds = new Set<string>();
      dbSteps.forEach(step => {
        if (step.assigned_user_ids && Array.isArray(step.assigned_user_ids)) {
          step.assigned_user_ids.forEach((userId: string | null) => { // Iterate over string | null
            if (userId) allUserIds.add(userId);
          });
        }
      });

      let userProfilesMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
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
          id: step.id, // This is workflow_steps.id (the step's own UUID)
          name: step.name,
          description: step.description,
          role: step.role,
          approvalRequired: step.approval_required,
          assignees: currentStepAssignees,
          step_order: step.step_order 
          // The frontend step object might not use step_order directly if relying on array index,
          // but good to have it if backend mutations need it.
        };
      });
    }
    
    const formattedWorkflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: (workflowData as any).description || null, // Cast to any for these potentially untyped fields
      brand_id: workflowData.brand_id,
      brand_name: workflowData.brands?.name || null,
      brand_color: workflowData.brands?.brand_color || null,
      template_id: (workflowData as any).template_id || null, 
      status: (workflowData as any).status || null, 
      steps: processedSteps, 
      steps_count: processedSteps.length,
      template_name: workflowData.content_templates?.name || null,
      created_at: workflowData.created_at,
      updated_at: workflowData.updated_at,
      created_by: (workflowData as any).created_by || null 
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
export const PUT = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    const body = await request.json();
    
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
          .eq('id', id)
          .single();

        if (fetchError) {
          console.warn('Could not fetch current workflow data for AI description regeneration:', fetchError.message);
        } else if (currentWorkflowData) {
          const wfName = body.name || currentWorkflowData.name;
          const brandIdForDesc = body.brand_id || currentWorkflowData.brand_id;
          const templateIdForDesc = body.template_id !== undefined ? body.template_id : currentWorkflowData.template_id;
          const stepsForDesc = body.steps || currentWorkflowData.steps || [];

          let brandNameForDesc = currentWorkflowData.brands?.name;
          if (body.brand_id && body.brand_id !== currentWorkflowData.brand_id) {
            const { data: brandData } = await supabase.from('brands').select('name').eq('id', body.brand_id).single();
            brandNameForDesc = brandData?.name;
          }

          let resolvedTemplateNameForDesc: string | null | undefined = currentWorkflowData.content_templates?.name;
          if (body.template_id !== undefined && body.template_id !== currentWorkflowData.template_id) {
             if (body.template_id === null) { // template is being removed
                resolvedTemplateNameForDesc = null;
             } else {
                const { data: templateData } = await supabase.from('content_templates').select('name').eq('id', body.template_id).single();
                resolvedTemplateNameForDesc = templateData?.name;
             }
          }

          const stepNamesForDesc = (Array.isArray(stepsForDesc) ? stepsForDesc.map((step: any) => step.name) : []).filter(Boolean);
          
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

    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    const steps = body.steps || [];
    const newInvitationsToCreate: WorkflowInvitation[] = [];
    const newUsersToInviteByEmail: string[] = [];

    for (const step of steps) {
      if (step.assignees && Array.isArray(step.assignees)) {
        for (const assignee of step.assignees) {
          if (assignee.id) continue;
          const { data: existingUser /*, error: userFetchError*/ } = await supabase
            .from('profiles') 
            .select('id')
            .eq('email', assignee.email)
            .maybeSingle();
          // if (userFetchError) { console.error('User fetch error for assignee:', userFetchError); /* Consider how to handle */ }
          if (existingUser) {
            assignee.id = existingUser.id;
          } else {
            newInvitationsToCreate.push({
              workflow_id: id,
              step_id: step.id, 
              email: assignee.email,
              role: step.role || 'editor',
              invite_token: uuidv4(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            if (!newUsersToInviteByEmail.includes(assignee.email)) {
              newUsersToInviteByEmail.push(assignee.email);
            }
          }
        }
      }
    }
    
    const rpcParams: any = {
      p_workflow_id: id,
      p_new_invitation_items: newInvitationsToCreate.length > 0 ? newInvitationsToCreate : null // Pass null if empty, as some RPCs might expect JSONB or null
    };

    if (body.name !== undefined) rpcParams.p_name = body.name;
    if (body.brand_id !== undefined) rpcParams.p_brand_id = body.brand_id;
    if (body.steps !== undefined) rpcParams.p_steps = steps;
    // Ensure template_id is passed as p_template_id, allowing null
    rpcParams.p_template_id = body.template_id !== undefined ? body.template_id : null;
    // Add description to RPC params if it was generated
    if (workflowDescriptionToUpdate !== undefined) {
      rpcParams.p_description = workflowDescriptionToUpdate;
    }

    const hasWorkflowChanges = (
      body.name !== undefined || 
      body.brand_id !== undefined || 
      body.steps !== undefined ||
      body.template_id !== undefined ||
      workflowDescriptionToUpdate !== undefined // Count description update as a change
    );

    if (!hasWorkflowChanges && newInvitationsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update or new invitations to create' },
        { status: 400 }
      );
    }
    
    console.log('Calling RPC update_workflow_and_handle_invites with params:', rpcParams);

    const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
      'update_workflow_and_handle_invites' as any, 
      rpcParams
    );

    if (rpcError) {
      console.error('RPC Error updating workflow and invitations:', rpcError);
      // Provide more specific error message if possible
      let errorMessage = `Failed to update workflow: ${rpcError.message}`;
      if (rpcError.details) errorMessage += ` Details: ${rpcError.details}`;
      if (rpcError.hint) errorMessage += ` Hint: ${rpcError.hint}`;
      // Do not throw here, let handleApiError manage the response
      return handleApiError(rpcError, errorMessage);
    }
    if (!rpcSuccess) {
        // This case might occur if RPC returns false explicitly for a handled failure
        console.error('RPC call update_workflow_and_handle_invites returned false or no data.');
        return handleApiError(new Error('RPC returned non-successful status'), 'Workflow update via RPC failed.');
    }
        
    if (newUsersToInviteByEmail.length > 0) {
      try {
        await verifyEmailTemplates();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const inviterId = user?.id || currentUser?.id;
        for (const email of newUsersToInviteByEmail) {
          try {
            let highestRole = 'viewer' as 'admin' | 'editor' | 'viewer';
            let firstStepIdForAssignment: number | string | null = null;

            for (const item of newInvitationsToCreate) { 
              if (item.email === email) {
                if (firstStepIdForAssignment === null) {
                  firstStepIdForAssignment = item.step_id;
                }
                if (item.role === 'admin') { 
                  highestRole = 'admin'; 
                  // No break here to ensure firstStepId is from the actual first item for this email
                } else if (item.role === 'editor' && highestRole !== 'admin') { 
                  highestRole = 'editor'; 
                }
              }
            }

            const appMetadataPayload: Record<string, any> = {
              full_name: '', 
              role: highestRole,
              invited_by: inviterId || undefined, 
              invited_from_workflow: id
            };

            if (firstStepIdForAssignment !== null) {
              appMetadataPayload.step_id_for_assignment = firstStepIdForAssignment;
            }

            await supabase.auth.admin.inviteUserByEmail(email, {
              data: appMetadataPayload
            });
          } catch (individualEmailInviteError: any) {
            console.error(`Failed to send invitation email to ${email} via Supabase Auth:`, individualEmailInviteError);
          }
        } 
      } catch (setupEmailError: any) {
        console.error('Error during email invitation setup:', setupEmailError);
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
      .eq('id', id)
      .single();

    if (finalFetchError) {
        return handleApiError(finalFetchError, 'Failed to refetch workflow after update, but update may have succeeded');
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: finalWorkflowData 
    });

  } catch (error: any) {
    // General error catching for unexpected issues before or after RPC
    console.error('General error in PUT /api/workflows/[id]:', error);
    return handleApiError(error, 'Error updating workflow');
  }
});

/**
 * DELETE endpoint to remove a specific workflow
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any, // Added user parameter from withAuth
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    
    const { data: contentCountResult, error: countError } = await supabase // Renamed data to contentCountResult
      .from('content')
      .select('id', { count: 'exact' })
      .eq('workflow_id', id);
      
    if (countError) throw countError;
    
    // contentCountResult is an array, so check its length
    if (contentCountResult && contentCountResult.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete workflow that has associated content' 
        },
        { status: 409 }
      );
    }
    
    // Deleting associated workflow invitations is handled automatically by 
    // ON DELETE CASCADE constraint defined in the database schema.
    // await supabase
    //   .from('workflow_invitations')
    //   .delete()
    //   .eq('workflow_id', id);
    
    // Delete the workflow itself (cascade will handle invitations)
    const { error: deleteErrorData, count } = await supabase // Renamed error to deleteErrorData
      .from('workflows')
      .delete()
      .eq('id', id)
      .select(); 
    
    if (deleteErrorData) throw deleteErrorData;
    
    if (count === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Workflow deleted successfully' 
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting workflow');
  }
}); 