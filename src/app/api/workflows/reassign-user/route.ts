import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { logSecurityEvent } from '@/lib/auth/account-lockout';
import type { Json } from '@/types/supabase';

// Schema for request validation
const ReassignUserSchema = z.object({
  from_user_id: z.string().uuid('Invalid from_user_id'),
  to_user_id: z.string().uuid('Invalid to_user_id'),
  brand_id: z.string().uuid('Invalid brand_id').optional(),
  workflow_ids: z.array(z.string().uuid()).optional()
});

// POST /api/workflows/reassign-user
// Reassign workflows from one user to another
export const POST = withAuth(async (request: NextRequest, user: User) => {
  try {
    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can reassign workflows' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ReassignUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      );
    }

    const { from_user_id, to_user_id, brand_id, workflow_ids } = validationResult.data;

    if (from_user_id === to_user_id) {
      return NextResponse.json(
        { success: false, error: 'Cannot reassign to the same user' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: fromProfile, error: fromProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', from_user_id)
      .maybeSingle();

    if (fromProfileError) {
      throw fromProfileError;
    }

    if (!fromProfile) {
      return NextResponse.json(
        { success: false, error: 'Source user not found.' },
        { status: 404 }
      );
    }

    const { data: toProfile, error: toProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', to_user_id)
      .maybeSingle();

    if (toProfileError) {
      throw toProfileError;
    }

    if (!toProfile) {
      return NextResponse.json(
        { success: false, error: 'Destination user not found.' },
        { status: 404 }
      );
    }

    const reassignAcrossWorkflows = async (workflowIds: string[], scope?: { brandId?: string }) => {
      if (workflowIds.length === 0) {
        return { reassignedCount: 0, reassignmentLog: [] as Array<{ workflow_id: string; workflow_name: string; steps_updated: number }> };
      }

      const { data: workflows, error: workflowsError } = await supabase
        .from('workflows')
        .select('id, name, brand_id, steps')
        .in('id', workflowIds);

      if (workflowsError) {
        throw workflowsError;
      }

      const workflowList = workflows || [];
      if (workflowList.length === 0) {
        return { reassignedCount: 0, reassignmentLog: [] };
      }

      const brandIds = new Set<string>();
      workflowList.forEach((workflow) => {
        if (workflow.brand_id) {
          brandIds.add(workflow.brand_id as string);
        }
      });

      if (brandIds.size > 0) {
        const { data: brandPermissions, error: brandPermError } = await supabase
          .from('user_brand_permissions')
          .select('brand_id')
          .eq('user_id', to_user_id)
          .in('brand_id', Array.from(brandIds));

        if (brandPermError) {
          throw brandPermError;
        }

        const allowedBrands = new Set((brandPermissions || []).map((p) => p.brand_id));
        for (const brandId of brandIds) {
          if (!allowedBrands.has(brandId)) {
            await logSecurityEvent('workflow_reassign_blocked', {
              reason: 'destination_missing_brand_access',
              brandId,
              fromUserId: from_user_id,
              toUserId: to_user_id,
              workflowIds,
            }, user.id);

            return NextResponse.json(
              { success: false, error: `Destination user must have access to brand ${brandId} before reassignment.` },
              { status: 400 }
            );
          }
        }
      }

      const { data: stepRows, error: stepError } = await supabase
        .from('workflow_steps')
        .select('id, workflow_id, assigned_user_ids')
        .in('workflow_id', workflowList.map((w) => w.id));

      if (stepError) {
        throw stepError;
      }

      const stepsByWorkflow = new Map<string, Array<{ id: string; assigned_user_ids: string[] | null }>>();
      (stepRows || []).forEach((row) => {
        if (!stepsByWorkflow.has(row.workflow_id)) {
          stepsByWorkflow.set(row.workflow_id, []);
        }
        stepsByWorkflow.get(row.workflow_id)!.push({ id: row.id, assigned_user_ids: row.assigned_user_ids });
      });

      const isoNow = new Date().toISOString();
      const reassignmentLog: Array<{ workflow_id: string; workflow_name: string; steps_updated: number }> = [];
      const workflowsUpdated: string[] = [];
      let reassignedCount = 0;

      for (const workflow of workflowList) {
        const stepChanges: Array<{ id: string; assigned_user_ids: string[] }> = [];
        const stepsForWorkflow = stepsByWorkflow.get(workflow.id) || [];

        stepsForWorkflow.forEach((step) => {
          const assigned = Array.isArray(step.assigned_user_ids) ? [...step.assigned_user_ids] : [];
          if (!assigned.includes(from_user_id)) {
            return;
          }

          const updated = assigned.filter((id) => id !== from_user_id);
          if (!updated.includes(to_user_id)) {
            updated.push(to_user_id);
          }

          stepChanges.push({ id: step.id, assigned_user_ids: updated });
        });

        if (stepChanges.length === 0) {
          continue;
        }

        for (const change of stepChanges) {
          const { error: updateStepError } = await supabase
            .from('workflow_steps')
            .update({ assigned_user_ids: change.assigned_user_ids, updated_at: isoNow })
            .eq('id', change.id);

          if (updateStepError) {
            throw updateStepError;
          }
        }

        let updatedStepsJson: Json = workflow.steps as Json;
        if (Array.isArray(workflow.steps)) {
          const mappedSteps = (workflow.steps as Array<Record<string, unknown>>).map((step) => {
            if (!Array.isArray(step.assignees)) {
              return step;
            }

            const assignees = step.assignees as Array<Record<string, unknown>>;
            const includesSource = assignees.some((assignee) => assignee?.id === from_user_id);
            if (!includesSource) {
              return step;
            }

            const filtered = assignees.filter((assignee) => assignee?.id !== from_user_id);
            const hasDestination = filtered.some((assignee) => assignee?.id === to_user_id);

            if (!hasDestination) {
              filtered.push({ id: to_user_id, email: toProfile.email, full_name: toProfile.full_name });
            }

            return { ...step, assignees: filtered };
          });
          updatedStepsJson = mappedSteps as unknown as Json;
        }

        const { error: updateWorkflowError } = await supabase
          .from('workflows')
          .update({ steps: updatedStepsJson, updated_at: isoNow })
          .eq('id', workflow.id);

        if (updateWorkflowError) {
          throw updateWorkflowError;
        }

        const { error: tasksUpdateError } = await supabase
          .from('user_tasks')
          .update({ user_id: to_user_id, updated_at: isoNow })
          .eq('user_id', from_user_id)
          .eq('workflow_id', workflow.id);

        if (tasksUpdateError && tasksUpdateError.code !== 'PGRST116') {
          throw tasksUpdateError;
        }

        workflowsUpdated.push(workflow.id);
        reassignedCount += 1;
        reassignmentLog.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          steps_updated: stepChanges.length,
        });
      }

      if (scope?.brandId) {
        await logSecurityEvent('workflow_reassign_brand', {
          fromUserId: from_user_id,
          toUserId: to_user_id,
          brandId: scope.brandId,
          workflowsExamined: workflowIds.length,
          workflowsReassigned: reassignedCount,
        }, user.id);
      } else {
        await logSecurityEvent('workflow_reassign_specific', {
          fromUserId: from_user_id,
          toUserId: to_user_id,
          workflowIds,
          reassignedCount,
        }, user.id);
      }

      return { reassignedCount, reassignmentLog };
    };

    if (workflow_ids && workflow_ids.length > 0) {
      const uniqueWorkflowIds = Array.from(new Set(workflow_ids));
      const result = await reassignAcrossWorkflows(uniqueWorkflowIds);
      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json({
        success: true,
        reassigned_count: result.reassignedCount,
        reassignment_log: result.reassignmentLog,
      });
    }

    if (brand_id) {
      const { data: brandWorkflows, error: brandWorkflowsError } = await supabase
        .from('workflows')
        .select('id')
        .eq('brand_id', brand_id);

      if (brandWorkflowsError) {
        throw brandWorkflowsError;
      }

      const workflowIds = (brandWorkflows || []).map((w) => w.id);
      const result = await reassignAcrossWorkflows(workflowIds, { brandId: brand_id });
      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json({
        success: true,
        reassigned_count: result.reassignedCount,
        reassignment_log: result.reassignmentLog,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Either brand_id or workflow_ids must be provided',
      },
      { status: 400 }
    );

  } catch (error) {
    return handleApiError(error, 'Error reassigning workflows');
  }
});
