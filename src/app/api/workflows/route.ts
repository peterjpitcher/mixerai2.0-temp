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
        *,
        brands:brand_id(name, brand_color),
        content:content(count)
      `)
      .order('created_at', { ascending: false });
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data: workflows, error } = await query;
    
    if (error) throw error;
    
    const formattedWorkflows = workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      brand_id: workflow.brand_id,
      brand_name: workflow.brands?.name || null,
      brand_color: workflow.brands?.brand_color || null,
      steps: workflow.steps,
      steps_count: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
      content_count: workflow.content?.[0]?.count || 0,
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
      p_steps: steps, // Use the processed steps (with assignee IDs if found)
      p_created_by: user.id,
      p_invitation_items: invitationItems // Array of items for users needing invites
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
    
    // If invitations were logged, send auth invites
    if (pendingInvites.length > 0) {
      try {
        await verifyEmailTemplates(); // Ensure email templates are okay
        
        for (const email of pendingInvites) {
          // Determine highest role for this email from the originally prepared items
          let highestRole = 'viewer' as 'admin' | 'editor' | 'viewer'; 
          for (const item of invitationItems) {
            if (item.email === email) {
              if (item.role === 'admin') {
                highestRole = 'admin';
                break;
              } else if (item.role === 'editor' && highestRole !== 'admin') {
                highestRole = 'editor';
              }
            }
          }
          
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name: '', // Cannot determine name reliably here
              role: highestRole,
              invited_by: user.id,
              invited_from_workflow: newWorkflowId // Use the returned ID
            }
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