import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { ok, fail } from '@/lib/http/response';
import { logClaimAudit } from '@/lib/audit';

export const dynamic = "force-dynamic";

// Schema for workflow assignment
const assignWorkflowSchema = z.object({
  workflow_id: z.string().uuid()
});

// Schema for workflow action (approve/reject)
const workflowActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  feedback: z.string().optional(),
  updatedClaimText: z.string().optional(),
  comment: z.string().optional()
});

// POST /api/claims/[id]/workflow - Assign workflow to claim
export const POST = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
  const { params } = context as { params: { id: string } };
  const claimId = params.id;

  try {
    const body = await req.json();
    const validatedData = assignWorkflowSchema.parse(body);
    
    const supabase = createSupabaseAdminClient();

    // Check if user has permission to modify this claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, created_by, level, master_brand_id')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) return fail(404, 'Claim not found');

    // Check permissions (similar to claims POST)
    let hasPermission = user?.user_metadata?.role === 'admin' || claim.created_by === user.id;

    if (!hasPermission && claim.level === 'brand' && claim.master_brand_id) {
      // Check brand admin permission
      const { data: mcbData } = await supabase
        .from('master_claim_brands')
        .select('mixerai_brand_id')
        .eq('id', claim.master_brand_id)
        .single();
      
      if (mcbData?.mixerai_brand_id) {
        const { data: permissions } = await supabase
          .from('user_brand_permissions')
          .select('role')
          .eq('user_id', user.id)
          .eq('brand_id', mcbData.mixerai_brand_id)
          .eq('role', 'admin')
          .limit(1);
        
        hasPermission = permissions !== null && permissions.length > 0;
      }
    }

    if (!hasPermission) return fail(403, 'Not authorized to modify this claim');

    // Assign workflow using the database function
    const { data: result, error: assignError } = await supabase.rpc('assign_workflow_to_claim', {
      p_claim_id: claimId,
      p_workflow_id: validatedData.workflow_id
    });

    if (assignError) return handleApiError(assignError, 'Failed to assign workflow');
    await logClaimAudit('CLAIM_WORKFLOW_ASSIGNED', user.id, claimId, { workflow_id: validatedData.workflow_id });
    return ok(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return handleApiError(error, 'Failed to assign workflow to claim');
  }
});

// PUT /api/claims/[id]/workflow - Perform workflow action (approve/reject)
export const PUT = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
  const { params } = context as { params: { id: string } };
  const claimId = params.id;

  try {
    const body = await req.json();
    const validatedData = workflowActionSchema.parse(body);
    
    const supabase = createSupabaseAdminClient();

    // Check if user is assigned to current workflow step
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select(`
        id,
        current_workflow_step,
        claims_workflow_steps!inner(
          id,
          assigned_user_ids
        )
      `)
      .eq('id', claimId)
      .single();

    if (claimError || !claim) return fail(404, 'Claim not found');

    if (!claim.current_workflow_step) return fail(400, 'Claim has no active workflow');

    // Check if user is assigned to current step
    const stepData = claim.claims_workflow_steps;
    const isAssigned = (stepData as unknown as Record<string, unknown>)?.assigned_user_ids && 
                       Array.isArray((stepData as unknown as Record<string, unknown>).assigned_user_ids) &&
                       ((stepData as unknown as Record<string, unknown>).assigned_user_ids as string[]).includes(user.id);

    if (!isAssigned && user?.user_metadata?.role !== 'admin') return fail(403, 'Not authorized to approve/reject this claim');

    // Update claim text if provided
    if (validatedData.updatedClaimText) {
      const { error: updateError } = await supabase
        .from('claims')
        .update({ claim_text: validatedData.updatedClaimText })
        .eq('id', claimId);
      
      if (updateError) return fail(500, 'Failed to update claim text');
    }

    // Perform workflow action
    // Note: The current database function only accepts 4 parameters
    // The new parameters (p_comment and p_updated_claim_text) require running the migration
    console.log('[API Claims Workflow] Calling advance_claim_workflow with:', {
      claimId,
      action: validatedData.action,
      feedback: validatedData.feedback || '',
      reviewerId: user.id
    });
    
    const { data: result, error: actionError } = await supabase.rpc('advance_claim_workflow', {
      p_claim_id: claimId,
      p_action: validatedData.action,
      p_feedback: validatedData.feedback || '',
      p_reviewer_id: user.id
    });

    if (actionError) return handleApiError(actionError, 'Failed to perform workflow action');
    
    console.log('[API Claims Workflow] Function result:', result);

    // If the action was successful and we have a comment, update the most recent history entry
    // This is a temporary workaround until the migration is applied
    if ((result as Record<string, unknown>)?.success && validatedData.comment) {
      const { error: updateError } = await supabase
        .from('claim_workflow_history')
        .update({ 
          feedback: validatedData.action === 'reject' 
            ? validatedData.comment 
            : (validatedData.feedback ? `${validatedData.feedback}\n\nComment: ${validatedData.comment}` : `Comment: ${validatedData.comment}`)
        })
        .eq('claim_id', claimId)
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (updateError) {
        console.error('Warning: Could not update history with comment:', updateError);
      }
    }

    await logClaimAudit('CLAIM_WORKFLOW_ACTION', user.id, claimId, { action: validatedData.action });
    return ok(result);

  } catch (error) {
    if (error instanceof z.ZodError) return fail(400, 'Invalid request data', JSON.stringify(error.errors));
    return handleApiError(error, 'Failed to perform workflow action');
  }
});

// GET /api/claims/[id]/workflow - Get workflow status and history
export const GET = withAuth(async (_req: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const claimId = params.id;

  try {
    const supabase = createSupabaseAdminClient();

    // Get claim with workflow details
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select(`
        id,
        workflow_id,
        current_workflow_step,
        workflow_status,
        claims_workflows(
          id,
          name
        ),
        claims_workflow_steps(
          id,
          name,
          role,
          step_order,
          assigned_user_ids
        )
      `)
      .eq('id', claimId)
      .single();

    if (claimError || !claim) return fail(404, 'Claim not found');

    // Get workflow history
    const { data: history, error: historyError } = await supabase
      .from('claim_workflow_history')
      .select(`
        id,
        step_name,
        action_status,
        feedback,
        created_at,
        reviewer:profiles(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('[API Claims Workflow] Error fetching workflow history:', historyError);
    }

    return ok({ claim, history: history || [] });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch workflow details');
  }
});
