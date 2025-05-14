// Import the uuid package for generating unique identifiers for workflow invitations
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/auth/api-auth';
import { verifyEmailTemplates } from '@/lib/auth/email-templates';

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

// Fallback data function removed as per no-fallback policy
// const getFallbackWorkflows = () => { ... };

/**
 * GET endpoint to retrieve all workflows with related data
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Build phase fallback removed
    // if (isBuildPhase()) { ... }
    
    const supabase = createSupabaseAdminClient();
    
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    
    let query = supabase
      .from('workflows')
      .select(`
        id,
        name,
        brand_id,
        created_at,
        updated_at,
        template_id,
        brands:brand_id ( name, brand_color ),
        content_templates:template_id ( name ),
        content ( count ),
        workflow_steps ( count )
      `)
      .order('created_at', { ascending: false });
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data: workflows, error } = await query;
    
    if (error) throw error;
    
    const formattedWorkflows = workflows.map((workflow: any) => ({
      id: workflow.id,
      name: workflow.name,
      brand_id: workflow.brand_id,
      brand_name: workflow.brands?.name || null,
      brand_color: workflow.brands?.brand_color || null,
      template_id: workflow.template_id,
      template_name: workflow.content_templates?.name || null,
      steps_count: workflow.workflow_steps && workflow.workflow_steps.length > 0 ? workflow.workflow_steps[0].count : 0,
      content_count: workflow.content && workflow.content.length > 0 ? workflow.content[0].count : 0,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: formattedWorkflows 
    });
  } catch (error) {
    // Database connection error fallback removed
    // if (isDatabaseConnectionError(error)) { ... }
    
    // Generic error handling (console.error removed from handleApiError or here)
    return handleApiError(error, 'Error fetching workflows');
  }
});

/**
 * POST endpoint to create a new workflow
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Workflow name is required' },
        { status: 400 }
      );
    }
    
    if (!body.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    const steps = body.steps || [];
    let workflowDescription = '';
    
    // --- AI Description Generation ---
    try {
      let brandNameForDesc;
      if (body.brand_id) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('name')
          .eq('id', body.brand_id)
          .single();
        brandNameForDesc = brandData?.name;
      }

      let templateNameForDesc;
      if (body.template_id) {
        const { data: templateData } = await supabase
          .from('content_templates')
          .select('name')
          .eq('id', body.template_id)
          .single();
        templateNameForDesc = templateData?.name;
      }
      
      const stepNamesForDesc = steps.map((step: any) => step.name).filter(Boolean);

      // Use the absolute URL for the fetch call during server-side execution
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const aiDescriptionResponse = await fetch(`${baseUrl}/api/ai/generate-workflow-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: body.name,
          brandName: brandNameForDesc,
          templateName: templateNameForDesc,
          stepNames: stepNamesForDesc,
        }),
      });

      if (aiDescriptionResponse.ok) {
        const aiData = await aiDescriptionResponse.json();
        if (aiData.success && aiData.description) {
          workflowDescription = aiData.description;
        } else {
          console.warn('AI description generation succeeded but no description was returned or success was false.');
        }
      } else {
        const errorData = await aiDescriptionResponse.json();
        console.warn('Failed to generate AI description:', errorData.error || aiDescriptionResponse.statusText);
        // Do not fail the workflow creation, just log a warning. Description will be empty or a default.
      }
    } catch (aiError) {
      console.warn('Error calling AI description generation service:', aiError);
      // Do not fail the workflow creation if AI description fails
    }
    // --- End AI Description Generation ---
    
    const invitationItems: {
      step_id: number;
      email: string;
      role: string;
      invite_token: string;
      expires_at: string;
    }[] = [];
    
    const pendingInvites: string[] = [];
    
    for (const step of steps) {
      if (step.assignees && Array.isArray(step.assignees)) {
        for (const assignee of step.assignees) {
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', assignee.email)
            .maybeSingle();
            
          if (existingUser) {
            assignee.id = existingUser.id;
          } else {
            invitationItems.push({
              step_id: step.id,
              email: assignee.email,
              role: step.role || 'editor',
              invite_token: uuidv4(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            if (!pendingInvites.includes(assignee.email)) {
              pendingInvites.push(assignee.email);
            }
          }
        }
      }
    }
    
    // Prepare data for RPC call
    const rpcParams = {
      p_name: body.name,
      p_brand_id: body.brand_id,
      p_steps_definition: steps, // Use the processed steps (with assignee IDs if found)
      p_created_by: user.id,
      p_invitation_items: invitationItems // Array of items for users needing invites
      // p_template_id: body.template_id || null, // Removed as per error hint
      // p_description: workflowDescription // Removed as per error hint
    };

    // Call the database function to create workflow and log invitations atomically
    const { data: newWorkflowId, error: rpcError } = await supabase.rpc(
      'create_workflow_and_log_invitations' as any, // TODO: Regenerate types
      rpcParams
    );

    if (rpcError) {
      console.error('RPC Error creating workflow and logging invitations:', rpcError);
      throw new Error(`Failed to create workflow: ${rpcError.message}`);
    }

    if (!newWorkflowId) {
      throw new Error('Workflow creation failed, no ID returned from function.');
    }
    
    // --- Update workflow with description and template_id ---
    if (newWorkflowId) {
      const { error: updateError } = await supabase
        .from('workflows')
        .update({
          description: workflowDescription, // The AI-generated or empty description
          template_id: body.template_id || null // The template_id from the request body
        })
        .eq('id', newWorkflowId);

      if (updateError) {
        console.error('Error updating workflow with description and template_id:', updateError);
        // Not throwing error here, as the core workflow and invitations are created.
        // The client will receive the workflow, potentially without these fields if update failed.
        // Consider if this should be a hard error based on requirements.
      }
    }
    // --- End update workflow ---

    // If invitations were logged, send auth invites
    if (pendingInvites.length > 0) {
      try {
        await verifyEmailTemplates(); // Ensure email templates are okay
        
        for (const email of pendingInvites) {
          // Determine highest role and first step_id for this email from the originally prepared items
          let highestRole = 'viewer' as 'admin' | 'editor' | 'viewer'; 
          let firstStepIdForAssignment: number | string | null = null;

          for (const item of invitationItems) {
            if (item.email === email) {
              if (firstStepIdForAssignment === null) {
                firstStepIdForAssignment = item.step_id;
              }
              if (item.role === 'admin') {
                highestRole = 'admin';
                // No break here if we still want to ensure firstStepId is from the actual first item encountered
              } else if (item.role === 'editor' && highestRole !== 'admin') {
                highestRole = 'editor';
              }
            }
          }
          
          const appMetadataPayload: Record<string, any> = {
            full_name: '', // Cannot determine name reliably here
            role: highestRole,
            invited_by: user.id,
            invited_from_workflow: newWorkflowId // Use the returned ID
          };

          if (firstStepIdForAssignment !== null) {
            appMetadataPayload.step_id_for_assignment = firstStepIdForAssignment;
          }
          
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: appMetadataPayload
          });
          
          if (inviteError) {
            // Log error, but don't fail the whole request as workflow/logs are created
            console.error(`Failed to send auth invite to ${email}:`, inviteError);
          } else {
            // console.log(`Successfully sent auth invite to ${email}`);
          }
        }
      } catch (inviteProcessError) {
        console.error('Error during the auth invite sending process:', inviteProcessError);
      }
    }
    
    // Fetch the created workflow details to return in the response
    const { data: createdWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select(`
        *,
        description,
        template_id,
        content_templates:template_id ( name ),
        brands:brand_id(name, brand_color)
      `)
      .eq('id', newWorkflowId)
      .single();

    if (fetchError) {
      console.error('Error fetching newly created workflow:', fetchError);
      return NextResponse.json({ 
        success: true, 
        workflow_id: newWorkflowId,
        warning: 'Workflow created, but failed to fetch full data.'
      });
    }

    const formattedWorkflow = {
      ...createdWorkflow,
      brand_name: createdWorkflow?.brands?.name || null,
      brand_color: createdWorkflow?.brands?.brand_color || null,
      description: createdWorkflow?.description || '', // Ensure description is included
      template_id: createdWorkflow?.template_id || null, // Ensure template_id is included
      template_name: createdWorkflow?.content_templates?.name || null, // Ensure template_name is included
      steps_count: Array.isArray(createdWorkflow?.steps) ? createdWorkflow.steps.length : 0,
      content_count: 0 // Assuming new workflow has no content yet
    };
    
    return NextResponse.json({
      success: true,
      workflow: formattedWorkflow
    });
  } catch (error) {
    // Logged error removed
    return handleApiError(error, 'Error creating workflow');
  }
}); 