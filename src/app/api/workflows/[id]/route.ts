// Import the uuid package for generating unique workflow invitation tokens
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError } from '@/lib/api-utils'; // Added for using in catch blocks
import { verifyEmailTemplates } from '@/lib/auth/email-templates'; // Added for sending invites
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
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    
    const { data: workflow, error: workflowErrorData } = await supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name, brand_color),
        content_types:content_type_id(name)
      `)
      .eq('id', id)
      .single();
    
    if (workflowErrorData) {
      if (workflowErrorData.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 404 }
        );
      }
      throw workflowErrorData;
    }
    
    // Assuming workflow.steps is an array of objects that should conform to WorkflowStep
    // We still need to be careful with the structure from JSONB
    const stepsArray = (workflow.steps || []) as any[]; 

    if (stepsArray.length > 0) {
      const userIds = new Set<string>();
      for (const step of stepsArray) {
        if (step && step.assignees && Array.isArray(step.assignees)) {
          for (const assignee of (step.assignees as WorkflowAssignee[])) {
            if (assignee.id) {
              userIds.add(assignee.id);
            }
          }
        }
      }
      
      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles') 
          .select('id, full_name, email')
          .in('id', Array.from(userIds));
        
        if (usersError) throw usersError; // Throw error if fetching profiles failed
        if (!usersData) throw new Error('User profiles data not found for assignees'); // Throw if data is unexpectedly null/undefined
          
        const userMap = new Map(usersData.map(user => [user.id, user]));
        
        for (const step of stepsArray) {
          if (step && step.assignees && Array.isArray(step.assignees)) {
            step.assignees = (step.assignees as WorkflowAssignee[]).map(assignee => {
              if (assignee.id && userMap.has(assignee.id)) {
                const userProfile = userMap.get(assignee.id)!;
                return {
                  ...assignee,
                  name: userProfile.full_name,
                  email: userProfile.email || assignee.email
                };
              }
              return assignee;
            });
          }
        }
      }
    }
    
    const formattedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      brand_id: workflow.brand_id,
      brand_name: workflow.brands?.name || null,
      brand_color: workflow.brands?.brand_color || null,
      content_type_id: workflow.content_type_id,
      content_type_name: workflow.content_types?.name || null,
      steps: workflow.steps, // Return original steps structure which might have updated assignees
      steps_count: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    };

    return NextResponse.json({ 
      success: true, 
      workflow: formattedWorkflow 
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch workflow');
  }
}

/**
 * PUT endpoint to update a specific workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    const body = await request.json();
    
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
          
          const { data: existingUser, error: userFetchError } = await supabase
            .from('profiles') 
            .select('id')
            .eq('email', assignee.email)
            .maybeSingle();
          
          if (userFetchError) {
            // Potentially log this error to a proper logging service in production
            // For now, continue, as the workflow update might still proceed for other parts
          } else if (existingUser) {
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
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.brand_id !== undefined) updateData.brand_id = body.brand_id;
    if (body.content_type_id !== undefined) updateData.content_type_id = body.content_type_id;
    if (body.steps !== undefined) updateData.steps = steps; 
    
    if (Object.keys(updateData).length === 0 && newInvitationsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update or new invitations to create' },
        { status: 400 }
      );
    }
    
    if (Object.keys(updateData).length > 0) {
      const { data: updatedWorkflowData, error: updateErrorData } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    
      if (updateErrorData) {
        if (updateErrorData.code === '23505') { 
          return NextResponse.json(
            { success: false, error: 'A workflow for this brand and content type already exists' },
            { status: 409 }
          );
        }
        throw updateErrorData;
      }
      
      if (!updatedWorkflowData && newInvitationsToCreate.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Workflow not found or no changes made' },
                { status: 404 }
            );
      }
    }
        
    if (newInvitationsToCreate.length > 0) {
      await supabase
        .from('workflow_invitations')
        .delete()
        .eq('workflow_id', id)
        .in('status', ['pending']);
        
      const { error: dbInvitationError } = await supabase
        .from('workflow_invitations')
        .insert(newInvitationsToCreate.map(inv => ({...inv, status: 'pending'})));
      
      if (dbInvitationError) {
        // Error creating invitations in DB. This is more critical than email sending.
        // Consider how to report this. For now, it will be caught by the main try-catch.
        throw dbInvitationError;
      } else {
        if (newUsersToInviteByEmail.length > 0) {
          try {
            await verifyEmailTemplates();
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const adminUserId = currentUser?.id;

            for (const email of newUsersToInviteByEmail) {
              let highestRole = 'viewer';
              for (const item of newInvitationsToCreate) {
                if (item.email === email) {
                  if (item.role === 'admin') {
                    highestRole = 'admin';
                    break;
                  } else if (item.role === 'editor' && highestRole !== 'admin') {
                    highestRole = 'editor';
                  }
                }
              }
              
              await supabase.auth.admin.inviteUserByEmail(email, {
                data: {
                  full_name: '',
                  role: highestRole,
                  invited_by: adminUserId || undefined, 
                  invited_from_workflow: id
                }
              });
            } 
          } catch (emailInviteError) {
            // Email sending failed. This is often non-critical to the core operation success.
            // Log to a proper monitoring service in production.
          }
        }
      } 
    } 
    
     const { data: finalWorkflowData, error: finalFetchError } = await supabase
      .from('workflows')
      .select('*') 
      .eq('id', id)
      .single();

    if (finalFetchError) {
        return handleApiError(finalFetchError, 'Failed to refetch workflow after update, but update may have succeeded');
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: finalWorkflowData 
    });
  } catch (error) {
    return handleApiError(error, 'Error updating workflow');
  }
}

/**
 * DELETE endpoint to remove a specific workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    await supabase
      .from('workflow_invitations')
      .delete()
      .eq('workflow_id', id);
    
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
} 