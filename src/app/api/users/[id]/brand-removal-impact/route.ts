import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

type WorkflowAssignmentRow = {
  workflow: {
    id: string;
    name: string | null;
    status: string | null;
    brand_id: string | null;
  } | null;
};

type UserTaskRow = {
  status: string | null;
  content: {
    id: string;
    title: string | null;
    status: string | null;
    brand_id: string | null;
  } | null;
};

const INACTIVE_TASK_STATUSES = new Set(['completed', 'cancelled', 'rejected', 'skipped', 'archived', 'done', 'declined']);

// GET /api/users/[id]/brand-removal-impact?brand_id=[brandId]
// Check the impact of removing a user from a brand
export const GET = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  try {
    const { params } = context as { params: { id: string } };
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brand_id parameter is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can check removal impact' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const [
      workflowAssignmentsResult,
      userTaskResult,
      userResult,
      brandResult
    ] = await Promise.all([
      supabase
        .from('workflow_user_assignments')
        .select(
          `
            workflow:workflows!inner(
              id,
              name,
              status,
              brand_id
            )
          `
        )
        .eq('user_id', params.id)
        .eq('workflows.brand_id', brandId),
      supabase
        .from('user_tasks')
        .select(
          `
            status,
            content:content!inner(
              id,
              title,
              status,
              brand_id
            )
          `
        )
        .eq('user_id', params.id)
        .eq('content.brand_id', brandId),
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', params.id)
        .maybeSingle(),
      supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .maybeSingle()
    ]);

    if (workflowAssignmentsResult.error) {
      throw workflowAssignmentsResult.error;
    }
    if (userTaskResult.error) {
      throw userTaskResult.error;
    }
    if (userResult.error) {
      throw userResult.error;
    }
    if (brandResult.error) {
      throw brandResult.error;
    }

    const workflowAssignments = (workflowAssignmentsResult.data ?? []) as WorkflowAssignmentRow[];
    const taskAssignments = (userTaskResult.data ?? []) as UserTaskRow[];

    const affectedWorkflows = Array.from(
      workflowAssignments.reduce<Map<string, { id: string; name?: string | null; status?: string | null }>>(
        (acc, entry) => {
          const workflow = entry.workflow;
          if (!workflow) {
            return acc;
          }
          if (workflow.brand_id !== brandId) {
            return acc;
          }
          const normalizedStatus = (workflow.status ?? '').toLowerCase();
          if (normalizedStatus === 'archived') {
            return acc;
          }
          if (!acc.has(workflow.id)) {
            acc.set(workflow.id, {
              id: workflow.id,
              name: workflow.name,
              status: workflow.status,
            });
          }
          return acc;
        },
        new Map()
      ).values()
    );

    const affectedContent = Array.from(
      taskAssignments.reduce<Map<string, { id: string; title?: string | null; status?: string | null }>>(
        (acc, task) => {
          const content = task.content;
          if (!content) {
            return acc;
          }
          if (content.brand_id !== brandId) {
            return acc;
          }
          const normalizedStatus = typeof task.status === 'string' ? task.status.toLowerCase() : null;
          if (normalizedStatus && INACTIVE_TASK_STATUSES.has(normalizedStatus)) {
            return acc;
          }
          if (!acc.has(content.id)) {
            acc.set(content.id, {
              id: content.id,
              title: content.title,
              status: content.status,
            });
          }
          return acc;
        },
        new Map()
      ).values()
    );

    const workflowCount = affectedWorkflows.length;
    const contentCount = affectedContent.length;
    const totalAssignments = workflowCount + contentCount;

    return NextResponse.json({
      success: true,
      user: {
        id: params.id,
        full_name: userResult.data?.full_name,
        email: userResult.data?.email
      },
      brand: {
        id: brandId,
        name: brandResult.data?.name
      },
      impact: {
        workflow_count: workflowCount,
        content_count: contentCount,
        total_assignments: totalAssignments,
        affected_workflows: affectedWorkflows,
        affected_content: affectedContent
      },
      recommendation:
        totalAssignments > 0
          ? 'User has active assignments. Reassignment will be required.'
          : 'User has no active assignments. Safe to remove.'
    });
  } catch (error) {
    return handleApiError(error, 'Error checking brand removal impact');
  }
});
