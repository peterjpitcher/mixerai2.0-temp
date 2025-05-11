import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

interface WorkflowStepAssignee {
  id?: string; // Assuming assignee object has an id property which is the user_id
  email?: string;
  // other potential assignee properties
}

interface WorkflowStep {
  id: string | number; // id of the step within the JSONB array
  name: string;
  assignees?: WorkflowStepAssignee[];
  // other step properties
}

export const GET = withAuth(async (request: NextRequest, user) => {
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserId = user.id;
  const supabase = createSupabaseAdminClient();

  try {
    const { data: allPendingContent, error: contentError } = await supabase
      .from('content')
      .select(`
        id,
        title,
        status,
        current_step,
        updated_at,
        brand:brands!inner(name, brand_color),
        template:content_templates!inner(name, icon),
        workflow:workflows!inner(id, name, steps)
      `)
      .eq('status', 'pending_review');

    if (contentError) throw contentError;

    if (!allPendingContent) {
      return NextResponse.json({ success: true, data: [] }); // No pending content found
    }

    const userTasks = allPendingContent.filter(contentItem => {
      if (!contentItem.workflow || !Array.isArray(contentItem.workflow.steps) || contentItem.current_step == null) {
        return false;
      }
      
      const currentStepIndex = contentItem.current_step as number;
      if (currentStepIndex < 0 || currentStepIndex >= contentItem.workflow.steps.length) {
        return false; // Invalid step index
      }

      // More careful access to step object and its properties
      const stepDataFromJSON = contentItem.workflow.steps[currentStepIndex];
      if (!stepDataFromJSON || typeof stepDataFromJSON !== 'object') {
        return false;
      }
      // Assert known properties, allow others to be potentially undefined as per WorkflowStep interface
      const currentStepObject: WorkflowStep = {
        id: (stepDataFromJSON as any).id || currentStepIndex, // Fallback to index if id field isn't in JSON step
        name: (stepDataFromJSON as any).name || 'Unnamed Step',
        assignees: (stepDataFromJSON as any).assignees as WorkflowStepAssignee[] | undefined,
        // include other properties from WorkflowStep if they are expected
      };
      
      if (currentStepObject && Array.isArray(currentStepObject.assignees)) {
        return currentStepObject.assignees.some(assignee => assignee && assignee.id === currentUserId);
      }
      return false;
    });

    return NextResponse.json({ success: true, data: userTasks });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user tasks');
  }
}); 