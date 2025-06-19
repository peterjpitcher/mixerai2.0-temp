import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { TablesUpdate, TablesInsert } from '@/types/supabase'; // Import types

export const dynamic = "force-dynamic";

interface WorkflowActionRequest {
  action: 'approve' | 'reject';
  feedback?: string;
}

async function getNextVersionNumber(supabase: ReturnType<typeof createSupabaseAdminClient>, contentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { 
    throw error;
  }
  return (data?.version_number || 0) + 1;
}

export const POST = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const contentId = params.id;
  let requestData: WorkflowActionRequest;

  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { action, feedback } = requestData;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });
  }
  if (action === 'reject' && (!feedback || feedback.trim() === '')) {
    return NextResponse.json({ success: false, error: 'Feedback is required for rejection.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // 1. Fetch current content and its current_step (UUID)
    const { data: currentContent, error: contentError } = await supabase
      .from('content')
      .select('id, status, workflow_id, current_step, content_data, assigned_to')
      .eq('id', contentId)
      .single();

    if (contentError) {
      console.error("Error fetching content for action:", contentError);
      return NextResponse.json({ success: false, error: contentError?.message || 'Content not found.' }, { status: 404 });
    }
    if (!currentContent) {
        return NextResponse.json({ success: false, error: 'Content data not found after fetch.'}, { status: 404 });
    }

    if (!currentContent.workflow_id) {
      return NextResponse.json({ success: false, error: 'Content is not associated with a workflow.' }, { status: 400 });
    }
    if (!currentContent.current_step) {
      return NextResponse.json({ success: false, error: 'Content is not currently at a valid workflow step.' }, { status: 400 });
    }

    // Fetch current workflow step details from workflow_steps table
    const { data: currentDbStep, error: currentStepDetailsError } = await supabase
      .from('workflow_steps')
      .select('id, name, step_order, approval_required, assigned_user_ids')
      .eq('id', currentContent.current_step) // current_step is UUID
      .single();

    if (currentStepDetailsError || !currentDbStep) {
      console.error("Error fetching current step details:", currentStepDetailsError);
      return NextResponse.json({ success: false, error: currentStepDetailsError?.message || 'Current workflow step details not found.' }, { status: 404 });
    }

    // 2. Verify Ownership/Authorization (user must be in assigned_user_ids of the current step)
    if (!currentDbStep.assigned_user_ids || !currentDbStep.assigned_user_ids.includes(user.id)) {
      // Also check if the user is a brand admin as a fallback for actioning tasks.
      // This might require fetching brand admin id similar to restart-workflow if not directly available.
      // For now, strictly checking step assignment.
      console.warn(`User ${user.id} not in assigned_user_ids ${currentDbStep.assigned_user_ids} for step ${currentDbStep.id}`);
      return NextResponse.json({ success: false, error: 'User is not assigned to the current step or not authorized.' }, { status: 403 });
    }

    // 3. Create Content Version
    const versionNumber = await getNextVersionNumber(supabase, contentId);
    const versionPayload: TablesInsert<'content_versions'> = {
      content_id: contentId,
      workflow_step_identifier: currentDbStep.id, // Store the UUID of the step
      step_name: currentDbStep.name,
      version_number: versionNumber,
      content_json: currentContent.content_data, 
      action_status: action,
      feedback: feedback || null,
      reviewer_id: user.id,
    };
    const { error: versionError } = await supabase.from('content_versions').insert(versionPayload);
    if (versionError) {
        console.error("Error creating content version:", versionError);
        throw versionError;
    }

    // 4. Determine Next Step & Prepare Content Update Payload
    const updatePayload: TablesUpdate<'content'> = {
        updated_at: new Date().toISOString(),
    };
    
    let newAssignmentsForNextStep: TablesInsert<'workflow_user_assignments'>[] = [];

    if (action === 'approve') {
      const { data: nextDbStep, error: nextStepError } = await supabase
        .from('workflow_steps')
        .select('id, assigned_user_ids')
        .eq('workflow_id', currentContent.workflow_id)
        .gt('step_order', currentDbStep.step_order)
        .order('step_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextStepError) {
        console.error("Error fetching next step:", nextStepError);
        throw nextStepError;
      }

      if (nextDbStep) {
        updatePayload.current_step = nextDbStep.id;
        updatePayload.status = 'pending_review';
        updatePayload.assigned_to = (nextDbStep.assigned_user_ids && nextDbStep.assigned_user_ids.length > 0) 
                                      ? nextDbStep.assigned_user_ids 
                                      : null;
        
        // Prepare workflow_user_assignments for the next step
        if (currentContent.workflow_id && nextDbStep.id && nextDbStep.assigned_user_ids && nextDbStep.assigned_user_ids.length > 0) {
          newAssignmentsForNextStep = nextDbStep.assigned_user_ids.map((assigneeId: string) => ({
            workflow_id: currentContent.workflow_id!,
            step_id: nextDbStep.id!,
            user_id: assigneeId,
          }));
        }

      } else {
        updatePayload.status = 'approved';
        updatePayload.current_step = null;
        updatePayload.assigned_to = null;
      }
    } else { // action === 'reject'
      updatePayload.status = 'rejected';
    }

    const { data: updatedContent, error: updateContentError } = await supabase
      .from('content')
      .update(updatePayload)
      .eq('id', contentId)
      .select()
      .single();

    if (updateContentError) {
        console.error("Error updating content after action:", updateContentError);
        throw updateContentError;
    }

    // If there are new assignments for the next step, upsert them
    if (newAssignmentsForNextStep.length > 0) {
      const { error: assignmentError } = await supabase
        .from('workflow_user_assignments')
        .upsert(newAssignmentsForNextStep, { onConflict: 'workflow_id,step_id,user_id' });

      if (assignmentError) {
        console.error("Error upserting new workflow_user_assignments:", assignmentError);
        // Decide if this error should be critical. For now, log and continue.
        // If this fails, user_tasks might not be created for the next step.
      }
    }

    // Send email notifications
    try {
      // Get content details for email
      const { data: content } = await supabase
        .from('content')
        .select('title, created_by')
        .eq('id', contentId)
        .single();
        
      if (content) {
        // Send notification to content creator about the action
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workflow_action',
            userId: content.created_by,
            contentId: contentId,
            action: action,
            feedback: feedback
          })
        });
        
        // If approved and moved to next step, send notifications to new assignees
        if (action === 'approve' && updatePayload.assigned_to && Array.isArray(updatePayload.assigned_to)) {
          for (const assigneeId of updatePayload.assigned_to) {
            // Create task for the assignee
            const { data: newTask } = await supabase
              .from('user_tasks')
              .insert({
                user_id: assigneeId,
                content_id: contentId,
                workflow_id: currentContent.workflow_id || '',
                workflow_step_id: updatePayload.current_step || '',
                workflow_step_name: null,
                status: 'pending',
                due_date: null
              })
              .select()
              .single();
              
            if (newTask) {
              // Send email notification for the task
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'task_assignment',
                  userId: assigneeId,
                  taskId: newTask.id,
                  contentId: contentId
                })
              });
            }
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the workflow action if email sending fails
    }

    return NextResponse.json({ success: true, message: `Content ${action}d successfully.`, data: updatedContent });

  } catch (error: unknown) {
    return handleApiError(error, 'Error processing workflow action');
  }
}); 