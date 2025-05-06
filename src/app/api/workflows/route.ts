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

// Sample fallback data for when DB connection fails
const getFallbackWorkflows = () => {
  return [
    {
      id: '1',
      name: 'Sample Content Workflow',
      brand_id: '1',
      brand_name: 'Sample Brand',
      content_type_id: '1',
      content_type_name: 'Article',
      steps: [
        { 
          id: 1, 
          name: 'Draft', 
          description: 'Initial draft creation',
          role: 'editor',
          approvalRequired: true,
          assignees: [
            { email: 'editor@example.com' }
          ] 
        },
        { 
          id: 2, 
          name: 'Review', 
          description: 'Content review by editorial team',
          role: 'editor',
          approvalRequired: true,
          assignees: [
            { email: 'reviewer@example.com' }
          ] 
        },
        { 
          id: 3, 
          name: 'Publish', 
          description: 'Final approval and publishing',
          role: 'admin',
          approvalRequired: true,
          assignees: [
            { email: 'admin@example.com' }
          ] 
        }
      ],
      steps_count: 3,
      content_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Another Workflow',
      brand_id: '2',
      brand_name: 'Another Brand',
      content_type_id: '2',
      content_type_name: 'Retailer PDP',
      steps: [
        { 
          id: 1, 
          name: 'Draft', 
          description: 'Initial product description',
          role: 'editor',
          approvalRequired: true,
          assignees: [
            { email: 'pdp@example.com' }
          ]
        },
        { 
          id: 2, 
          name: 'Publish', 
          description: 'Final approval',
          role: 'admin',
          approvalRequired: true,
          assignees: [
            { email: 'admin@example.com' }
          ]
        }
      ],
      steps_count: 2,
      content_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

/**
 * GET endpoint to retrieve all workflows with related data
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock workflows during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        workflows: getFallbackWorkflows()
      });
    }
    
    console.log('Attempting to fetch workflows from database');
    const supabase = createSupabaseAdminClient();
    
    // Parse URL to check for brand_id filter
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    
    // Base query
    let query = supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name, brand_color),
        content_types:content_type_id(name),
        content:content(count)
      `)
      .order('created_at', { ascending: false });
    
    // Apply brand_id filter if specified
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    // Execute the query
    const { data: workflows, error } = await query;
    
    if (error) throw error;
    
    // Format the response
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

    console.log(`Successfully fetched ${formattedWorkflows.length} workflows`);
    
    return NextResponse.json({ 
      success: true, 
      workflows: formattedWorkflows 
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback workflows data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        workflows: getFallbackWorkflows()
      });
    }
    
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
    
    // Validate required fields
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
    
    // Validate steps format if provided
    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    // Process assignees - create invitations for each email if needed
    const steps = body.steps || [];
    const invitationItems: {
      step_id: number;
      email: string;
      role: string;
      invite_token: string;
      expires_at: string;
    }[] = [];
    
    const pendingInvites: string[] = []; // Track emails that need invites
    
    for (const step of steps) {
      if (step.assignees && Array.isArray(step.assignees)) {
        for (const assignee of step.assignees) {
          // Check if the user exists
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', assignee.email)
            .maybeSingle();
            
          if (existingUser) {
            // User exists, set their ID in the assignee
            assignee.id = existingUser.id;
          } else {
            // User doesn't exist, prepare an invitation
            invitationItems.push({
              step_id: step.id,
              email: assignee.email,
              role: step.role || 'editor',
              invite_token: uuidv4(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
            });
            
            // Add to pending invites if not already added
            if (!pendingInvites.includes(assignee.email)) {
              pendingInvites.push(assignee.email);
            }
          }
        }
      }
    }
    
    // Insert the new workflow with the current user as created_by
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        name: body.name,
        brand_id: body.brand_id,
        content_type_id: body.content_type_id,
        steps: steps,
        created_by: user.id // Set the authenticated user as the creator
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // If we have workflow invitations to create, insert them
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
        console.error('Error creating workflow invitations:', invitationError);
        // We'll continue even if there's an error with invitations
      }
      
      // Send email invitations to users who don't exist yet
      if (pendingInvites.length > 0) {
        try {
          // Verify email templates
          await verifyEmailTemplates();
          
          // Send invites
          for (const email of pendingInvites) {
            // Find the highest role for this user across all steps
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
            
            // Send the invitation
            const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
              data: {
                full_name: '',
                role: highestRole,
                invited_by: user.id, // Track who sent the invitation
                invited_from_workflow: workflow.id
              }
            });
            
            if (inviteError) {
              console.error(`Error inviting user ${email}:`, inviteError);
              // Continue with other invites
            } else {
              console.log(`Successfully invited user ${email} with role ${highestRole}`);
            }
          }
        } catch (inviteError) {
          console.error('Error sending user invitations:', inviteError);
          // Continue with the workflow creation
        }
      }
    }
    
    // Fetch brand and content type data to include in response
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
    
    // Format the workflow response
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
    console.error('Error creating workflow:', error);
    return handleApiError(error, 'Error creating workflow');
  }
}); 