import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

import { User } from '@supabase/supabase-js';
// import { TablesUpdate, TablesInsert } from '@/types/supabase'; // TODO: Uncomment when types are regenerated
import { executeTransaction } from '@/lib/db/transactions';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

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

export const POST = withAuthAndCSRF(async (request: NextRequest, user: User, context?: unknown): Promise<Response> => {
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

    // Get next step info if approving
    let nextAssigneeId: string | null = null;
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

      if (nextDbStep && nextDbStep.assigned_user_ids && nextDbStep.assigned_user_ids.length > 0) {
        nextAssigneeId = nextDbStep.assigned_user_ids[0]; // For transaction, we'll handle multiple assignees separately
      }
    }

    // Use transactional function to update workflow status
    const transactionResult = await executeTransaction<{ new_status: string; new_step: number }>(
      supabase,
      'update_content_workflow_status',
      {
        p_content_id: contentId,
        p_user_id: user.id,
        p_action: action,
        p_comments: feedback || null,
        p_new_assignee_id: nextAssigneeId,
        p_version_data: {
          workflow_step_identifier: currentDbStep.id,
          step_name: currentDbStep.name,
          content_json: currentContent.content_data,
          action_status: action,
          feedback: feedback || null
        }
      }
    );

    if (!transactionResult.success || !transactionResult.data) {
      throw new Error(transactionResult.error || 'Failed to update workflow status');
    }

    const { new_status, new_step } = transactionResult.data[0];

    // Handle multiple assignees if needed (the transaction only handles the first one)
    if (action === 'approve' && new_step && currentContent.workflow_id) {
      const { data: nextDbStep } = await supabase
        .from('workflow_steps')
        .select('id, assigned_user_ids')
        .eq('workflow_id', currentContent.workflow_id)
        .eq('step_order', new_step)
        .single();

      if (nextDbStep && nextDbStep.assigned_user_ids && nextDbStep.assigned_user_ids.length > 1) {
        // Insert additional assignees (first one was handled by transaction)
        const additionalAssignees = nextDbStep.assigned_user_ids.slice(1).map((assigneeId: string) => ({
          workflow_id: currentContent.workflow_id!,
          step_id: nextDbStep.id!,
          user_id: assigneeId,
        }));

        const { error: assignmentError } = await supabase
          .from('workflow_user_assignments')
          .upsert(additionalAssignees, { onConflict: 'workflow_id,step_id,user_id' });

        if (assignmentError) {
          console.error("Error upserting additional workflow_user_assignments:", assignmentError);
        }
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
        if (action === 'approve' && new_step && currentContent.workflow_id) {
          const { data: nextDbStep } = await supabase
            .from('workflow_steps')
            .select('id, assigned_user_ids')
            .eq('workflow_id', currentContent.workflow_id)
            .eq('step_order', new_step)
            .single();
            
          if (nextDbStep && nextDbStep.assigned_user_ids && Array.isArray(nextDbStep.assigned_user_ids)) {
            for (const assigneeId of nextDbStep.assigned_user_ids) {
            // Create task for the assignee
            const { data: newTask } = await supabase
              .from('user_tasks')
              .insert({
                user_id: assigneeId,
                content_id: contentId,
                workflow_id: currentContent.workflow_id || '',
                workflow_step_id: nextDbStep.id || '',
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
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the workflow action if email sending fails
    }

    return NextResponse.json({ success: true, message: `Content ${action}d successfully.`, data: { 
      id: contentId,
      status: new_status,
      current_step: new_step 
    } });

  } catch (error: unknown) {
    return handleApiError(error, 'Error processing workflow action');
  }
}); 