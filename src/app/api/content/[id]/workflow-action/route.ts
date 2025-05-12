import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

interface WorkflowActionRequest {
  action: 'approve' | 'reject';
  feedback?: string;
}

// Helper to get the current owner_id for a step
async function getStepOwnerId(supabase: any, workflowId: string, stepNumericId: number): Promise<string | null> {
  // Query workflow_user_assignments to find the owner for the given workflow_id and step_id (numeric)
  const { data: assignment, error: assignError } = await supabase
    .from('workflow_user_assignments')
    .select('user_id')
    .eq('workflow_id', workflowId)
    .eq('step_id', stepNumericId) // step_id in this table is the numeric ID/index from JSON
    .maybeSingle(); // Use maybeSingle as a step might not have an assignee or could have one

  if (assignError) {
    console.error('Error fetching step assignment:', assignError);
    return null;
  }
  return assignment?.user_id || null;
}

async function getNextVersionNumber(supabase: any, contentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('content_versions')
    .select('version_number', { count: 'exact', head: false }) // Use count if just checking existence for version 1
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle as there might be no versions yet

  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found, which is fine for first version
    throw error;
  }
  return (data?.version_number || 0) + 1;
}

export const POST = withAuth(async (request: NextRequest, user, context: { params: { id: string } }) => {
  const contentId = context.params.id;
  let requestData: WorkflowActionRequest;

  try {
    requestData = await request.json();
  } catch (e) {
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
    // 1. Fetch current content and its workflow (including steps JSONB)
    const { data: currentContent, error: contentError } = await supabase
      .from('content')
      .select('*, workflow:workflows(*)') // Fetch the full workflow, including its steps JSONB
      .eq('id', contentId)
      .single();

    if (contentError || !currentContent) {
      return NextResponse.json({ success: false, error: contentError?.message || 'Content not found.' }, { status: 404 });
    }

    if (!currentContent.workflow_id || !currentContent.workflow || !Array.isArray(currentContent.workflow.steps) || currentContent.workflow.steps.length === 0) {
      return NextResponse.json({ success: false, error: 'Content is not associated with a valid workflow or workflow has no steps.' }, { status: 400 });
    }
    
    const currentStepIndex = currentContent.current_step as number; // current_step is an integer index
    const workflowSteps = currentContent.workflow.steps as any[]; // Array of step objects from JSONB

    if (currentStepIndex < 0 || currentStepIndex >= workflowSteps.length) {
      return NextResponse.json({ success: false, error: 'Invalid current step index for content.' }, { status: 400 });
    }
    
    const currentStepObject = workflowSteps[currentStepIndex];
    // Assume steps in JSONB have a numeric `id` field that corresponds to `workflow_user_assignments.step_id`
    // and `content.current_step` also stores this numeric `id` or index.
    const currentStepNumericId = currentStepObject.id || currentStepIndex; // Prefer step.id from JSON if present, else use index.

    // 2. Verify Ownership
    const stepOwnerId = await getStepOwnerId(supabase, currentContent.workflow_id, currentStepNumericId);
    if (!stepOwnerId) {
         return NextResponse.json({ success: false, error: 'Could not determine step owner or step has no owner.' }, { status: 403 });
    }
    if (stepOwnerId !== user.id) {
      return NextResponse.json({ success: false, error: 'User is not authorized to perform this action on the current step.' }, { status: 403 });
    }

    // 3. Create Content Version
    const versionNumber = await getNextVersionNumber(supabase, contentId);
    const { error: versionError } = await supabase
      .from('content_versions')
      .insert({
        content_id: contentId,
        workflow_step_identifier: String(currentStepNumericId), // Store the numeric ID/index from JSON step
        step_name: currentStepObject.name || `Step ${currentStepIndex + 1}`,
        version_number: versionNumber,
        content_json: currentContent.content_data, // Snapshot current content_data
        action_status: action === 'approve' ? 'Completed' : 'Rejected',
        feedback: feedback || null,
        reviewer_id: user.id,
      });

    if (versionError) throw versionError;

    // 4. Update Content Status & Current Step
    let updatedContentStatus = currentContent.status;
    let nextStepIndex = currentContent.current_step; // Remains same for reject or if it's the last step approved

    if (action === 'approve') {
      if (currentStepIndex < workflowSteps.length - 1) {
        nextStepIndex = currentStepIndex + 1;
        updatedContentStatus = 'pending_review';
      } else {
        updatedContentStatus = 'approved'; 
      }
    } else { // action === 'reject'
      updatedContentStatus = 'rejected';
    }

    const { data: updatedContent, error: updateContentError } = await supabase
      .from('content')
      .update({
        status: updatedContentStatus,
        current_step: nextStepIndex, // This will be the next step index or same if rejected/last step
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId)
      .select()
      .single();

    if (updateContentError) throw updateContentError;

    return NextResponse.json({ success: true, message: `Content ${action}d successfully.`, data: updatedContent });

  } catch (error: any) {
    return handleApiError(error, 'Error processing workflow action');
  }
}); 