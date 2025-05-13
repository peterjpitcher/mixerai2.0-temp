import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
// Import shared types if needed, though the select query will define the shape
// import type { WorkflowStep, WorkflowAssignee } from '@/types/models'; 

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, user) => {
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    const { data: tasks, error } = await supabase
      .from('user_tasks')
      .select(`
        *,
        content:content!content_id (
          id,
          title,
          status,
          brand:brands!brand_id (id, name, brand_color),
          workflow:workflows!workflow_id (id, name)
        ),
        workflow_step_details:workflow_steps!workflow_step_id (id, name, step_order)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user tasks:', error);
      throw error;
    }

    if (!tasks) {
      return NextResponse.json({ success: true, data: [] });
    }

    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      task_status: task.status,
      due_date: task.due_date,
      created_at: task.created_at,
      content_id: task.content?.id,
      content_title: task.content?.title,
      content_status: task.content?.status,
      brand_id: task.content?.brand?.id,
      brand_name: task.content?.brand?.name,
      brand_color: task.content?.brand?.brand_color,
      workflow_id: task.content?.workflow?.id,
      workflow_name: task.content?.workflow?.name,
      workflow_step_id: task.workflow_step_details?.id, 
      workflow_step_name: task.workflow_step_details?.name || task.workflow_step_name || 'N/A',
      workflow_step_order: task.workflow_step_details?.step_order
    }));

    return NextResponse.json({ success: true, data: formattedTasks });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user tasks');
  }
}); 