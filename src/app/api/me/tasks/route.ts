import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { isRecursivePolicyError, isRLSError } from '@/lib/api/rls-helpers';
import { createLogger } from '@/lib/observability/logger';
import type { Database } from '@/types/supabase';
// Import shared types if needed, though the select query will define the shape
// import type { WorkflowStep, WorkflowAssignee } from '@/types/models'; 

export const dynamic = "force-dynamic";

const logger = createLogger('api:me:tasks');

export const GET = withAuth(async (request: NextRequest, user) => {
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let supabase: SupabaseClient<Database>;

  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    logger.warn('Falling back to session client; service role unavailable', {
      userId: user.id,
      error,
    });
    supabase = createSupabaseServerClient();
  }
  const globalRole = user?.user_metadata?.role;
  let permittedBrandIds: string[] = [];

  const url = new URL(request.url);
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
  const requestedBrandIdsRaw = url.searchParams.getAll('brandId');
  const requestedBrandIds = Array.from(
    new Set(
      requestedBrandIdsRaw
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const searchTermRaw = url.searchParams.get('search');
  const searchTerm = searchTermRaw?.trim() ?? '';
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
      if (isRecursivePolicyError(permissionsError) || isRLSError(permissionsError)) {
        logger.warn('Brand permissions query hit RLS policy; returning empty result', {
          userId: user.id,
          error: permissionsError,
        });

        return NextResponse.json({
          success: false,
          error: 'Unable to verify brand permissions right now.',
          code: 'BRAND_PERMISSION_UNAVAILABLE',
        }, { status: 503 });
      }

      logger.error('Failed to fetch brand permissions', {
        userId: user.id,
        error: permissionsError,
      });
      return handleApiError(permissionsError, 'Failed to fetch user brand permissions');
    }

    if (!permissionsData || permissionsData.length === 0) {
      logger.info('User has no brand permissions', { userId: user.id });
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have access to any brands yet. Ask an administrator for access.',
          code: 'NO_BRAND_PERMISSIONS',
        },
        { status: 403 },
      );
    }

    const uniqueBrandIds = new Set(
      permissionsData
        .map((permission) => permission.brand_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    if (uniqueBrandIds.size === 0) {
      logger.info('User permissions list contained no valid brand IDs', { userId: user.id });
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have access to any brands yet. Ask an administrator for access.',
          code: 'NO_BRAND_PERMISSIONS',
        },
        { status: 403 },
      );
    }

    permittedBrandIds = Array.from(uniqueBrandIds);

    if (requestedBrandIds.length > 0) {
      const allowedRequestedBrandIds = requestedBrandIds.filter((brandId) =>
        permittedBrandIds.includes(brandId),
      );

      if (
        allowedRequestedBrandIds.length === 0 ||
        allowedRequestedBrandIds.length !== requestedBrandIds.length
      ) {
        logger.info('User attempted to filter tasks by forbidden brand', {
          userId: user.id,
          requestedBrandIds,
          permittedBrandIds,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to view tasks for that brand.',
            code: 'BRAND_FILTER_FORBIDDEN',
          },
          { status: 403 },
        );
      }

      permittedBrandIds = allowedRequestedBrandIds;
    }
  }

  let brandFilterForQuery: string[] | null = null;
  if (globalRole === 'admin') {
    if (requestedBrandIds.length > 0) {
      brandFilterForQuery = requestedBrandIds;
    }
  } else {
    brandFilterForQuery = permittedBrandIds;
  }

  const toSupabaseArrayLiteral = (values: string[]): string => {
    const escaped = values.map((value) => `"${value.replace(/"/g, '\\"')}"`);
    return `{${escaped.join(',')}}`;
  };

  try {
    const assignedArrayLiteral = toSupabaseArrayLiteral([user.id]);
    const assignedFilter = [`assigned_to.cs.${assignedArrayLiteral}`, `assigned_to.eq.${assignedArrayLiteral}`].join(',');

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

    if (brandFilterForQuery && brandFilterForQuery.length > 0) {
      contentQuery = contentQuery.in('brand_id', brandFilterForQuery);
    }

    if (searchTerm) {
      const sanitizedSearch = searchTerm.replace(/[%_]/g, '');
      if (sanitizedSearch) {
        contentQuery = contentQuery.ilike('title', `%${sanitizedSearch}%`);
      }
    }

    const { data: contentItems, error, count } = await contentQuery
      .order('updated_at', { ascending: false })
      .range(offset, offset + validatedLimit - 1);

    if (error) {
      if (isRecursivePolicyError(error) || isRLSError(error)) {
        logger.warn('Task query blocked by RLS policy', {
          userId: user.id,
          error,
        });

        return NextResponse.json({
          success: false,
          error: 'You do not have permission to view tasks for the selected brands.',
          code: 'CONTENT_RLS_VIOLATION',
        }, { status: 403 });
      }

      logger.error('Error fetching tasks for user', {
        userId: user.id,
        error,
      });
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
    if (isRecursivePolicyError(error) || isRLSError(error)) {
      logger.warn('Returning permission denied due to policy error', {
        userId: user.id,
        error,
      });

      return NextResponse.json({
        success: false,
        error: 'You do not have permission to view these tasks.',
        code: 'CONTENT_POLICY_EXCEPTION',
      }, { status: 403 });
    }

    logger.error('Unhandled error fetching tasks', {
      userId: user.id,
      error,
    });
    return handleApiError(error, 'Failed to fetch user tasks');
  }
});
