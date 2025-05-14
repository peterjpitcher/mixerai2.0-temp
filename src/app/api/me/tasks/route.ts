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
    // Query directly from the 'content' table
    const { data: contentItems, error } = await supabase
      .from('content')
      .select(`
        id,
        title,
        status,
        created_at, 
        updated_at,
        current_step, 
        assigned_to,
        brand:brands!brand_id (id, name, brand_color),
        workflow:workflows!workflow_id (id, name),
        workflow_step_details:workflow_steps!current_step (id, name, step_order)
      `)
      // Filter for content assigned to the current user
      // The string interpolation for user.id needs to be handled carefully for array contains
      .filter('assigned_to', 'cs', `{"${user.id}"}`)
      // Filter for actionable content statuses
      .in('status', ['pending_review', 'rejected', 'draft'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user tasks from content:', error);
      throw error;
    }

    if (!contentItems) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Adapt the mapping to the TaskItem interface from my-tasks/page.tsx
    const formattedTasks = contentItems.map((item: any) => ({
      id: item.id, // Use content.id as the task identifier
      task_status: item.status === 'pending_review' ? 'pending' : item.status, // Map content status to task status
      due_date: null, // No direct due_date on content table
      created_at: item.created_at, // content.created_at could serve as task creation time contextually
      content_id: item.id,
      content_title: item.title,
      content_status: item.status,
      brand_id: item.brand?.id,
      brand_name: item.brand?.name,
      brand_color: item.brand?.brand_color,
      workflow_id: item.workflow?.id,
      workflow_name: item.workflow?.name,
      workflow_step_id: item.workflow_step_details?.id, 
      workflow_step_name: item.workflow_step_details?.name || 'N/A',
      workflow_step_order: item.workflow_step_details?.step_order
    }));

    return NextResponse.json({ success: true, data: formattedTasks });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user tasks');
  }
}); 