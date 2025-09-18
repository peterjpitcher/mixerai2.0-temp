import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { logSecurityEvent } from '@/lib/auth/account-lockout';

// GET /api/workflows/orphaned-assignments
// Find workflows with assignments to users who no longer have access to the brand
export const GET = withAuth(async (request: NextRequest, user: User) => {
  try {
    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can check for orphaned assignments' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, brand_id, steps, brands:brand_id(name)')
      .eq('status', 'active');

    if (workflowError) {
      throw workflowError;
    }

    const workflowList = workflows || [];
    if (workflowList.length === 0) {
      await logSecurityEvent('workflow_orphaned_assignments_checked', {
        workflowsScanned: 0,
        orphanedWorkflows: 0,
        orphanedAssignments: 0,
      }, user.id);

      return NextResponse.json({ success: true, orphaned_count: 0, workflows_with_orphans: 0, details: [] });
    }

    const workflowIds = workflowList.map((workflow) => workflow.id);

    const { data: stepRows, error: stepError } = await supabase
      .from('workflow_steps')
      .select('workflow_id, assigned_user_ids')
      .in('workflow_id', workflowIds);

    if (stepError) {
      throw stepError;
    }

    const assignmentsByWorkflow = new Map<string, Set<string>>();
    const allUserIds = new Set<string>();
    const brandIds = new Set<string>();

    (stepRows || []).forEach((row) => {
      if (!assignmentsByWorkflow.has(row.workflow_id)) {
        assignmentsByWorkflow.set(row.workflow_id, new Set<string>());
      }
      const set = assignmentsByWorkflow.get(row.workflow_id)!;
      (row.assigned_user_ids || []).forEach((id) => {
        if (id) {
          set.add(id);
          allUserIds.add(id);
        }
      });
    });

    workflowList.forEach((workflow) => {
      const set = assignmentsByWorkflow.get(workflow.id) ?? new Set<string>();
      if (!assignmentsByWorkflow.has(workflow.id)) {
        assignmentsByWorkflow.set(workflow.id, set);
      }

      if (Array.isArray(workflow.steps)) {
        (workflow.steps as Array<Record<string, unknown>>).forEach((step) => {
          if (!Array.isArray(step.assignees)) {
            return;
          }
          (step.assignees as Array<Record<string, unknown>>).forEach((assignee) => {
            const id = assignee?.id as string | undefined;
            if (id) {
              set.add(id);
              allUserIds.add(id);
            }
          });
        });
      }

      if (workflow.brand_id) {
        brandIds.add(workflow.brand_id as string);
      }
    });

    let brandPermissionsSet = new Set<string>();
    if (brandIds.size > 0 && allUserIds.size > 0) {
      const { data: brandPermissions, error: brandPermError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id, user_id')
        .in('brand_id', Array.from(brandIds))
        .in('user_id', Array.from(allUserIds));

      if (brandPermError) {
        throw brandPermError;
      }

      brandPermissionsSet = new Set((brandPermissions || []).map((permission) => `${permission.brand_id}:${permission.user_id}`));
    }

    let adminUsersSet = new Set<string>();
    if (allUserIds.size > 0) {
      const { data: adminUsers, error: adminUsersError } = await supabase
        .from('user_system_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', Array.from(allUserIds));

      if (adminUsersError) {
        throw adminUsersError;
      }

      adminUsersSet = new Set((adminUsers || []).map((entry) => entry.user_id).filter(Boolean) as string[]);
    }

    const orphanedSummaries: Array<{
      workflowId: string;
      workflowName: string;
      brandId: string;
      brandName: string;
      orphanedIds: string[];
    }> = [];
    const orphanedUserIds = new Set<string>();

    for (const workflow of workflowList) {
      if (!workflow.brand_id) {
        continue;
      }

      const assigned = Array.from(assignmentsByWorkflow.get(workflow.id) || new Set<string>());
      if (assigned.length === 0) {
        continue;
      }

      const orphaned = assigned.filter((userId) => {
        if (adminUsersSet.has(userId)) {
          return false;
        }
        return !brandPermissionsSet.has(`${workflow.brand_id}:${userId}`);
      });

      if (orphaned.length === 0) {
        continue;
      }

      orphaned.forEach((id) => orphanedUserIds.add(id));
      orphanedSummaries.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        brandId: workflow.brand_id as string,
        brandName: (workflow.brands as { name?: string } | null)?.name || '',
        orphanedIds: orphaned,
      });
    }

    let userDetailsMap = new Map<string, { id: string; full_name: string | null; email: string | null }>();
    if (orphanedUserIds.size > 0) {
      const { data: userDetails, error: userDetailsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(orphanedUserIds));

      if (userDetailsError) {
        throw userDetailsError;
      }

      userDetailsMap = new Map((userDetails || []).map((detail) => [detail.id, detail]));
    }

    const orphanedData = orphanedSummaries.map(({ workflowId, workflowName, brandId, brandName, orphanedIds }) => ({
      workflow_id: workflowId,
      workflow_name: workflowName,
      brand_id: brandId,
      brand_name: brandName,
      orphaned_users: orphanedIds.map((id) => userDetailsMap.get(id) || { id, full_name: null, email: null }),
    }));

    await logSecurityEvent('workflow_orphaned_assignments_checked', {
      workflowsScanned: workflowList.length,
      orphanedWorkflows: orphanedData.length,
      orphanedAssignments: orphanedData.reduce((sum, entry) => sum + entry.orphaned_users.length, 0),
    }, user.id);

    return NextResponse.json({
      success: true,
      orphaned_count: orphanedData.reduce((sum, entry) => sum + entry.orphaned_users.length, 0),
      workflows_with_orphans: orphanedData.length,
      details: orphanedData,
    });
  } catch (error) {
    return handleApiError(error, 'Error checking orphaned assignments');
  }
});
