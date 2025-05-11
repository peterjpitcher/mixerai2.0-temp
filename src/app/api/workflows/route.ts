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
        content_types:content_type_id(name),
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
      content_type_id: workflow.content_type_id,
      content_type_name: workflow.content_types?.name || null,
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
    
    if (!body.content_type_id) {
      return NextResponse.json(
        { success: false, error: 'Content type ID is required' },
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
    
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        name: body.name,
        brand_id: body.brand_id,
        content_type_id: body.content_type_id,
        steps: steps,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    if (invitationItems.length > 0 && workflow) {
      const workflowInvitations: WorkflowInvitation[] = invitationItems.map(item => ({
        workflow_id: workflow.id,
        ...item,
        status: 'pending'
      }));
      
      const { error: invitationError } = await supabase
        .from('workflow_invitations')
        .insert(workflowInvitations);
      
      if (invitationError) {
        // Logged error removed, handleApiError or specific response preferred
        // Consider if this should be a more critical error response to client
      }
      
      if (pendingInvites.length > 0) {
        try {
          await verifyEmailTemplates();
          
          for (const email of pendingInvites) {
            let highestRole = 'viewer';
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
                full_name: '',
                role: highestRole,
                invited_by: user.id,
                invited_from_workflow: workflow.id
              }
            });
            
            if (inviteError) {
              // Logged error removed
            } else {
              // Logged success removed
            }
          }
        } catch (inviteError) {
          // Logged error removed
        }
      }
    }
    
    const { data: brand } = await supabase
      .from('brands')
      .select('name, brand_color')
      .eq('id', body.brand_id)
      .single();
    
    const { data: contentType } = await supabase
      .from('content_types')
      .select('name')
      .eq('id', body.content_type_id)
      .single();
    
    const formattedWorkflow = {
      ...workflow,
      brand_name: brand?.name || null,
      brand_color: brand?.brand_color || null,
      content_type_name: contentType?.name || null,
      steps_count: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
      content_count: 0
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