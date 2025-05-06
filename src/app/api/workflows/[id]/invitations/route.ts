import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { v4 as uuidv4 } from 'uuid';
import { verifyEmailTemplates } from '@/lib/auth/email-templates';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define a generic type for steps from the database
interface AssigneeData {
  email: string;
  id?: string;
}

interface StepData {
  id: number;
  name: string;
  description?: string;
  role?: string;
  approvalRequired?: boolean;
  assignees?: AssigneeData[];
  [key: string]: any;
}

// Extract company name from email domain
const extractCompanyFromEmail = (email: string) => {
  try {
    const domain = email.split('@')[1];
    if (!domain) return '';
    
    // Remove common TLDs and extract the main domain name
    const mainDomain = domain.split('.')[0];
    
    // Capitalize the first letter of each word
    return mainDomain
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    console.error('Error extracting company from email:', error);
    return '';
  }
};

/**
 * POST endpoint to invite users to a workflow step
 * This handles sending new invitations for users who don't yet have accounts
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { id } = request.nextUrl.pathname.match(/\/api\/workflows\/(.+?)\/invitations/)?.[1] 
      ? { id: request.nextUrl.pathname.match(/\/api\/workflows\/(.+?)\/invitations/)?.[1] }
      : { id: null };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.email || !body.stepId) {
      return NextResponse.json(
        { success: false, error: 'Email and step ID are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    // Get the workflow to validate it exists and get step info
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
    
    if (workflowError) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // Find the step in the workflow - handle safely with type checking and use any type to avoid TS errors
    let step: any = undefined;
    
    if (workflow && workflow.steps && Array.isArray(workflow.steps)) {
      // Find the step with matching ID
      step = workflow.steps.find((s: any) => 
        s && typeof s === 'object' && 
        typeof s.id === 'number' && 
        s.id === parseInt(body.stepId)
      );
    }
    
    if (!step) {
      return NextResponse.json(
        { success: false, error: 'Step not found in workflow' },
        { status: 404 }
      );
    }
    
    // Check if user already exists in the system
    const { data: existingUsers, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100, // Get a reasonable batch to search through
    });
    
    // Filter users by email
    const matchingUsers = existingUsers?.users.filter(u => u.email === body.email) || [];
    const userExists = matchingUsers.length > 0;
    
    // Generate an invitation token and expiry (7 days)
    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Create a workflow invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('workflow_invitations')
      .insert({
        workflow_id: id,
        step_id: body.stepId,
        email: body.email,
        role: step.role || 'editor',
        invite_token: inviteToken,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single();
    
    if (invitationError) {
      return NextResponse.json(
        { success: false, error: 'Failed to create invitation' },
        { status: 500 }
      );
    }
    
    // For new users, also send a Supabase auth invitation
    if (!userExists) {
      try {
        // Verify email templates
        await verifyEmailTemplates();
        
        // Determine role based on step role
        let userRole = 'viewer';
        if (step.role === 'admin') {
          userRole = 'admin';
        } else if (step.role === 'editor' || step.role === 'brand' || step.role === 'legal') {
          userRole = 'editor';
        }
        
        // Send the invitation
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(body.email, {
          data: {
            full_name: body.full_name || '',
            job_title: body.job_title || '',
            company: body.company || extractCompanyFromEmail(body.email) || '',
            role: userRole,
            invited_by: user.id,
            invited_from_workflow: id
          }
        });
        
        if (inviteError) {
          console.error('Error inviting user:', inviteError);
          // Continue anyway since we created the workflow invitation
        }
      } catch (emailError) {
        console.error('Error sending email invitation:', emailError);
        // Continue anyway since we created the workflow invitation
      }
    }
    
    // Update the step in the workflow to include this assignee
    try {
      if (workflow && workflow.steps && Array.isArray(workflow.steps)) {
        // Create a deep copy to avoid mutating the original
        const updatedSteps = JSON.parse(JSON.stringify(workflow.steps));
        
        // Find the step to update
        const stepIndex = updatedSteps.findIndex((s: any) => 
          s && typeof s === 'object' && 
          typeof s.id === 'number' && 
          s.id === parseInt(body.stepId)
        );
        
        if (stepIndex !== -1) {
          // Initialize assignees array if it doesn't exist
          if (!updatedSteps[stepIndex].assignees) {
            updatedSteps[stepIndex].assignees = [];
          }
          
          // Check if the assignee is already in the list
          const assignees = updatedSteps[stepIndex].assignees;
          const existingAssignee = Array.isArray(assignees) ? 
            assignees.find((a: any) => a && a.email === body.email) : 
            undefined;
          
          if (!existingAssignee) {
            // Add the new assignee
            updatedSteps[stepIndex].assignees.push({
              email: body.email,
              id: userExists && matchingUsers[0]?.id ? matchingUsers[0].id : undefined
            });
            
            // Update the workflow steps
            const { error: updateError } = await supabase
              .from('workflows')
              .update({ steps: updatedSteps })
              .eq('id', id);
            
            if (updateError) {
              console.error('Error updating workflow steps:', updateError);
            }
          }
        }
      }
    } catch (updateError) {
      console.error('Error updating workflow assignees:', updateError);
    }
    
    return NextResponse.json({
      success: true,
      invitation
    });
  } catch (error) {
    return handleApiError(error, 'Error creating invitation');
  }
});

/**
 * GET endpoint to get all invitations for a workflow
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { id } = request.nextUrl.pathname.match(/\/api\/workflows\/(.+?)\/invitations/)?.[1] 
      ? { id: request.nextUrl.pathname.match(/\/api\/workflows\/(.+?)\/invitations/)?.[1] }
      : { id: null };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    const { data: invitations, error } = await supabase
      .from('workflow_invitations')
      .select('*')
      .eq('workflow_id', id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      invitations
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching invitations');
  }
}); 