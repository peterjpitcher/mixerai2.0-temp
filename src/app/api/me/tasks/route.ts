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
  let permittedBrandIds: string[] = [];

  const url = new URL(request.url);
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
  const validatedPage = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
  const validatedLimit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, limitParam)) : 20;
  const offset = (validatedPage - 1) * validatedLimit;

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
      return NextResponse.json({ success: true, data: [] });
    }

    const uniqueBrandIds = new Set(
      permissionsData
        .map((permission) => permission.brand_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    if (uniqueBrandIds.size === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    permittedBrandIds = Array.from(uniqueBrandIds);
  }

  try {
    const assignedFilter = `assigned_to.cs.${JSON.stringify([user.id])},assigned_to.eq.${user.id}`;

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
        brand:brands!brand_id (id, name, brand_color, logo_url),
        workflow:workflows!workflow_id (id, name),
        workflow_step_details:workflow_steps!current_step (id, name, step_order)
      `, { count: 'exact' })
      // Filter for content assigned to the current user (handles array or scalar storage)
      .or(assignedFilter)
      // Filter for actionable content statuses (active content in review)
      .in('status', ['draft', 'pending_review']);

    if (globalRole !== 'admin' && permittedBrandIds.length > 0) {
      // Non-admin user - filter tasks by permitted brand IDs
      contentQuery = contentQuery.in('brand_id', permittedBrandIds);
    } else if (globalRole === 'admin') {
      // Admin user - fetch tasks from all brands
    }

    const { data: contentItems, error, count } = await contentQuery
      .order('updated_at', { ascending: false })
      .range(offset, offset + validatedLimit - 1);

    if (error) {
      console.error('Error fetching user tasks from content:', error);
      throw error;
    }

    if (!contentItems) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Adapt the mapping to the TaskItem interface from my-tasks/page.tsx
    const formattedTasks = contentItems.map((item: Record<string, unknown>) => {
      const brand = item.brand as { id: string; name: string; brand_color: string; logo_url?: string | null } | undefined;
      const workflow = item.workflow as { id: string; name: string } | undefined;
      const workflow_step_details = item.workflow_step_details as { id: string; name: string; step_order: number } | undefined;
      
      return {
        id: item.id, // Use content.id as the task identifier
        task_status: item.status === 'pending_review' ? 'pending' : item.status, // Map content status to task status
        due_date: null, // No direct due_date on content table
        created_at: item.created_at, // content.created_at could serve as task creation time contextually
        content_id: item.id,
        content_title: item.title,
        content_status: item.status,
        brand_id: brand?.id,
        brand_name: brand?.name,
        brand_color: brand?.brand_color,
        brand_logo_url: brand?.logo_url,
        workflow_id: workflow?.id,
        workflow_name: workflow?.name,
        workflow_step_id: workflow_step_details?.id, 
        workflow_step_name: workflow_step_details?.name || 'N/A',
        workflow_step_order: workflow_step_details?.step_order
      };
    });

    const total = count ?? formattedTasks.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / validatedLimit);

    return NextResponse.json({
      success: true,
      data: formattedTasks,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1
      }
    });

  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch user tasks');
  }
}); 
