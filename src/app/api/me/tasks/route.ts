import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import type { WorkflowStep, WorkflowAssignee } from '@/types/models'; // Import shared types

export const dynamic = "force-dynamic";

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
      
      // Runtime check for the step data structure
      if (!stepDataFromJSON || typeof stepDataFromJSON !== 'object') {
        return false;
      }
      // Assert type after runtime check
      const currentStepObject = stepDataFromJSON as unknown as WorkflowStep;
      
      // Check if the assignees array exists and includes the current user
      if (Array.isArray(currentStepObject.assignees)) {
        return currentStepObject.assignees.some(assignee => {
          // Runtime check for individual assignee object
          if (assignee && typeof assignee === 'object' && assignee.id) {
            // Assert type after runtime check for assignee
            return (assignee as WorkflowAssignee).id === currentUserId;
          }
          return false;
        });
      }
      return false;
    });

    return NextResponse.json({ success: true, data: userTasks });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user tasks');
  }
}); 