import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { TablesUpdate } from '@/types/supabase';

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const contentId = params.id;

  const supabase = createSupabaseAdminClient();

  try {
    // 1. Fetch current content and its brand to check admin status
    const { data: currentContent, error: contentError } = await supabase
      .from('content')
      .select('id, status, workflow_id, brand:brands!inner(brand_admin_id)')
      .eq('id', contentId)
      .single();

    if (contentError) {
        if (contentError.code === 'PGRST116') { // Not found
            return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
        }
        console.error('Error fetching current content:', contentError);
        throw contentError;
    }
    if (!currentContent) {
      return NextResponse.json({ success: false, error: 'Content not found after fetch.' }, { status: 404 });
    }
    
    // Explicitly check if brand and brand_admin_id were loaded.
    // The !inner join in select should ensure brand is present if content is found, but good to be safe.
    if (!currentContent.brand || typeof currentContent.brand !== 'object' || !currentContent.brand.brand_admin_id) {
        return NextResponse.json({ success: false, error: 'Brand admin information not found for this content.' }, { status: 404 });
    }

    // 2. Verify user is the brand_admin_id for this content's brand
    if (currentContent.brand.brand_admin_id !== user.id) {
      return NextResponse.json({ success: false, error: 'User is not authorized to restart this workflow.' }, { status: 403 });
    }

    // 3. Verify content status is 'rejected'
    if (currentContent.status !== 'rejected') {
      return NextResponse.json({ success: false, error: 'Content must be in rejected status to restart workflow.' }, { status: 400 });
    }

    if (!currentContent.workflow_id) {
      return NextResponse.json({ success: false, error: 'Content is not associated with a workflow.' }, { status: 400 });
    }

    // Fetch the first step of the workflow
    let firstStepId: string | null = null;
    let firstStepAssignees: string[] | null = null;

    const { data: firstWorkflowStep, error: stepError } = await supabase
      .from('workflow_steps')
      .select('id, assigned_user_ids')
      .eq('workflow_id', currentContent.workflow_id)
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (stepError) {
      console.error('Error fetching first workflow step:', stepError);
      throw stepError;
    }

    if (firstWorkflowStep) {
      firstStepId = firstWorkflowStep.id;
      if (firstWorkflowStep.assigned_user_ids && firstWorkflowStep.assigned_user_ids.length > 0) {
        firstStepAssignees = firstWorkflowStep.assigned_user_ids;
      }
    } else {
      console.warn(`Workflow ${currentContent.workflow_id} has no steps defined.`);
    }
    
    const updatePayload: TablesUpdate<'content'> = {
      current_step: firstStepId, 
      assigned_to: firstStepAssignees,
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedContent, error: updateError } = await supabase
      .from('content')
      .update(updatePayload)
      .eq('id', contentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating content to restart workflow:', updateError);
      throw updateError;
    }

    // Optionally, create a content_version entry for this restart action.
    // Consider this for future enhancement if audit trail for restarts is needed.

    return NextResponse.json({ success: true, message: 'Workflow restarted successfully.', data: updatedContent });

  } catch (error: unknown) {
    return handleApiError(error, 'Error restarting workflow');
  }
}); 