import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

import { User } from '@supabase/supabase-js';
// import { TablesUpdate, TablesInsert } from '@/types/supabase'; // TODO: Uncomment when types are regenerated
// import { executeTransaction } from '@/lib/db/transactions';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = "force-dynamic";

interface WorkflowActionRequest {
  action: 'approve' | 'reject';
  feedback?: string;
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
      .select('id, status, workflow_id, current_step, content_data, assigned_to, brand_id, created_by')
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

    const globalRole = user?.user_metadata?.role;
    let isAuthorizedForStep = Array.isArray(currentDbStep.assigned_user_ids) && currentDbStep.assigned_user_ids.includes(user.id);

    if (!isAuthorizedForStep && globalRole === 'admin') {
      isAuthorizedForStep = true;
    }

    if (!isAuthorizedForStep && currentContent.created_by === user.id) {
      isAuthorizedForStep = true;
    }

    if (!isAuthorizedForStep && currentContent.brand_id) {
      const { data: brandPermission, error: brandPermissionError } = await supabase
        .from('user_brand_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', currentContent.brand_id)
        .maybeSingle();

      if (brandPermissionError) {
        console.error('[Workflow Action] Error checking brand permissions:', brandPermissionError);
        return handleApiError(brandPermissionError, 'Failed to verify user permissions for workflow action');
      }

      if (brandPermission && brandPermission.role === 'admin') {
        isAuthorizedForStep = true;
      }
    }

    if (!isAuthorizedForStep) {
      console.warn(`User ${user.id} not authorized for workflow step ${currentDbStep.id}`);
      return NextResponse.json({ success: false, error: 'User is not assigned to the current step or not authorized.' }, { status: 403 });
    }

    const { data: latestVersion, error: latestVersionError } = await supabase
      .from('content_versions')
      .select('version_number')
      .eq('content_id', contentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersionError) {
      console.error('Error fetching latest content version:', latestVersionError);
    }

    const nextVersionNumber = ((latestVersion?.version_number as number | null) ?? 0) + 1;

    // Get next step info if approving
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
        // Next assignee will be notified via the workflow system
        // nextAssigneeId = nextDbStep.assigned_user_ids[0]; // For transaction, we'll handle multiple assignees separately
      }
    }

    // Handle the workflow action without relying on missing RPC function
    let new_status: string = 'pending_review';
    let new_step: string | null = null;
    
    if (action === 'reject') {
      // For rejection: update content status to 'rejected' and clear assignments
      new_status = 'rejected';
      
      // Update content status and remove from assigned_to
      const { error: updateError } = await supabase
        .from('content')
        .update({
          status: 'rejected',
          assigned_to: [],
          current_step: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);
        
      if (updateError) {
        console.error('Error updating content for rejection:', updateError);
        throw updateError;
      }
      
      // Mark any pending user_tasks as completed/rejected
      const { error: taskError } = await supabase
        .from('user_tasks')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('content_id', contentId)
        .eq('status', 'pending');
        
      if (taskError) {
        console.error('Error updating user tasks for rejection:', taskError);
      }
      
      // Enqueue notification for rejection
      const { data: contentData } = await supabase
        .from('content')
        .select('title, brands!brand_id(name)')
        .eq('id', contentId)
        .single();
      
      if (contentData && currentContent.assigned_to && currentContent.assigned_to.length > 0) {
        // Notify the content creator about rejection
        // TODO: Uncomment after migration is applied
        /* for (const userId of currentContent.assigned_to) {
          await supabase.rpc('enqueue_workflow_notification', {
            p_content_id: contentId,
            p_workflow_id: currentContent.workflow_id,
            p_step_id: currentContent.current_step,
            p_recipient_id: userId,
            p_action: 'rejected',
            p_content_title: contentData.title || 'Content',
            p_brand_name: (contentData.brands as any)?.name || 'Brand',
            p_step_name: currentDbStep.name,
            p_comment: feedback
          });
        } */
      }
      
      // Create a version record for the rejection
      const { error: versionError } = await supabase
        .from('content_versions')
        .insert({
          content_id: contentId,
          workflow_step_identifier: currentDbStep.id,
          step_name: currentDbStep.name,
          version_number: nextVersionNumber,
          content_json: currentContent.content_data,
          action_status: 'rejected',
          feedback: feedback || null,
          reviewer_id: user.id
        });
        
      if (versionError) {
        console.error('Error creating version record:', versionError);
      }
      
    } else if (action === 'approve') {
      // For approval: move to next step or mark as approved
      const { data: nextDbStep, error: nextStepError } = await supabase
        .from('workflow_steps')
        .select('id, assigned_user_ids, step_order')
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
        // Move to next step
        new_status = 'pending_review';
        new_step = nextDbStep.id;
        
        // Update content with next step and assignees
        const { error: updateError } = await supabase
          .from('content')
          .update({
            status: 'pending_review',
            current_step: nextDbStep.id,
            assigned_to: nextDbStep.assigned_user_ids || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', contentId);
          
        if (updateError) {
          console.error('Error updating content for approval:', updateError);
          throw updateError;
        }
        
        // Mark current tasks as completed
        const { error: taskError } = await supabase
          .from('user_tasks')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('content_id', contentId)
          .eq('workflow_step_id', currentDbStep.id)
          .eq('status', 'pending');
          
        if (taskError) {
          console.error('Error completing current tasks:', taskError);
        }
        
        // Enqueue notifications for next reviewers
        const { data: contentData } = await supabase
          .from('content')
          .select('title, brands!brand_id(name)')
          .eq('id', contentId)
          .single();
        
        if (contentData && nextDbStep.assigned_user_ids && nextDbStep.assigned_user_ids.length > 0) {
          await supabase
            .from('workflow_steps')
            .select('name')
            .eq('id', nextDbStep.id)
            .single();
            
          // TODO: Uncomment after migration is applied
          /* for (const userId of nextDbStep.assigned_user_ids) {
            await supabase.rpc('enqueue_workflow_notification', {
              p_content_id: contentId,
              p_workflow_id: currentContent.workflow_id,
              p_step_id: nextDbStep.id,
              p_recipient_id: userId,
              p_action: 'review_required',
              p_content_title: contentData.title || 'Content',
              p_brand_name: (contentData.brands as any)?.name || 'Brand',
              p_step_name: nextStepData?.name || 'Review',
              p_comment: feedback
            });
          } */
        }
        
      } else {
        // No more steps - mark as fully approved
        new_status = 'approved';
        
        const { error: updateError } = await supabase
          .from('content')
          .update({
            status: 'approved',
            current_step: null,
            assigned_to: [],
            updated_at: new Date().toISOString()
          })
          .eq('id', contentId);
          
        if (updateError) {
          console.error('Error updating content for final approval:', updateError);
          throw updateError;
        }
        
        // Mark all tasks as completed
        const { error: taskError } = await supabase
          .from('user_tasks')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('content_id', contentId)
          .eq('status', 'pending');
          
        if (taskError) {
          console.error('Error completing all tasks:', taskError);
        }
        
        // Enqueue notification for final approval
        const { data: contentData } = await supabase
          .from('content')
          .select('title, brands!brand_id(name), created_by')
          .eq('id', contentId)
          .single();
        
        if (contentData && contentData.created_by) {
          // TODO: Uncomment after migration is applied
          /* await supabase.rpc('enqueue_workflow_notification', {
            p_content_id: contentId,
            p_workflow_id: currentContent.workflow_id,
            p_step_id: currentDbStep.id,
            p_recipient_id: contentData.created_by,
            p_action: 'approved',
            p_content_title: contentData.title || 'Content',
            p_brand_name: (contentData.brands as any)?.name || 'Brand',
            p_step_name: 'Final Approval',
            p_comment: feedback
          }); */
        }
      }
      
      // Create a version record for the approval
      const { error: versionError } = await supabase
        .from('content_versions')
        .insert({
          content_id: contentId,
          workflow_step_identifier: currentDbStep.id,
          step_name: currentDbStep.name,
          version_number: nextVersionNumber,
          content_json: currentContent.content_data,
          action_status: 'approved',
          feedback: feedback || null,
          reviewer_id: user.id
        });
        
      if (versionError) {
        console.error('Error creating version record:', versionError);
      }
    }

    // Handle multiple assignees if needed (the transaction only handles the first one)
    if (action === 'approve' && new_step && currentContent.workflow_id) {
      const { data: nextDbStep } = await supabase
        .from('workflow_steps')
        .select('id, assigned_user_ids')
        .eq('id', new_step)
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
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
        const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        await fetch(`${baseUrl}/api/notifications/email`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('authorization') || '',
            'x-csrf-token': request.headers.get('x-csrf-token') || '',
            'Cookie': request.headers.get('cookie') || ''
          },
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
            .eq('id', new_step)
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
              await fetch(`${baseUrl}/api/notifications/email`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': request.headers.get('authorization') || '',
                  'x-csrf-token': request.headers.get('x-csrf-token') || '',
                  'Cookie': request.headers.get('cookie') || ''
                },
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
