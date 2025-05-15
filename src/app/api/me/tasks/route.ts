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
  const globalRole = user?.user_metadata?.role;
  let permittedBrandIds: string[] | null = null;

  if (globalRole !== 'admin') {
    // Fetch brand_permissions directly for the user
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select('brand_id')
      .eq('user_id', user.id);

    if (permissionsError) {
      console.error('[API Tasks GET] Error fetching brand permissions for user:', user.id, permissionsError);
      return handleApiError(permissionsError, 'Failed to fetch user brand permissions');
    }

    if (!permissionsData || permissionsData.length === 0) {
      console.log('[API Tasks GET] Non-admin user has no brand permissions in user_brand_permissions table. Returning empty array for tasks.');
      return NextResponse.json({ success: true, data: [] });
    }
    
    permittedBrandIds = permissionsData.map(p => p.brand_id).filter(id => id != null);
    
    if (permittedBrandIds.length === 0) {
      console.log('[API Tasks GET] Non-admin user has no valid brand IDs after fetching permissions. Returning empty array for tasks.');
      return NextResponse.json({ success: true, data: [] });
    }
    console.log(`[API Tasks GET] User ${user.id} (role: ${globalRole}) has permitted brand IDs: ${permittedBrandIds.join(', ')}`);
  }

  try {
    // Query directly from the 'content' table
    let contentQuery = supabase
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
      .filter('assigned_to', 'cs', `{"${user.id}"}`)
      // Filter for actionable content statuses
      .in('status', ['pending_review', 'rejected', 'draft']);

    if (globalRole !== 'admin' && permittedBrandIds) {
      console.log(`[API Tasks GET] Non-admin user. Filtering tasks by permitted brand IDs: ${permittedBrandIds.join(', ')}`);
      contentQuery = contentQuery.in('brand_id', permittedBrandIds);
    } else if (globalRole === 'admin') {
      console.log('[API Tasks GET] Admin user. Fetching tasks from all brands.');
    }

    const { data: contentItems, error } = await contentQuery.order('updated_at', { ascending: false });

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