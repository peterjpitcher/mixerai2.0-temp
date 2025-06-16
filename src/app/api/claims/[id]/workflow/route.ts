import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Schema for workflow assignment
const assignWorkflowSchema = z.object({
  workflow_id: z.string().uuid()
});

// Schema for workflow action (approve/reject)
const workflowActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  feedback: z.string().optional()
});

// POST /api/claims/[id]/workflow - Assign workflow to claim
export const POST = withAuth(async (req: NextRequest, user: User, context: Record<string, unknown>) => {
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

    if (claimError || !claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
    }

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
        
        hasPermission = permissions && permissions.length > 0;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ success: false, error: 'Not authorized to modify this claim' }, { status: 403 });
    }

    // Assign workflow using the database function
    const { data: result, error: assignError } = await supabase.rpc('assign_workflow_to_claim', {
      p_claim_id: claimId,
      p_workflow_id: validatedData.workflow_id
    });

    if (assignError) {
      console.error('[API Claims Workflow] Error assigning workflow:', assignError);
      return handleApiError(assignError, 'Failed to assign workflow');
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return handleApiError(error, 'Failed to assign workflow to claim');
  }
});

// PUT /api/claims/[id]/workflow - Perform workflow action (approve/reject)
export const PUT = withAuth(async (req: NextRequest, user: User, context: Record<string, unknown>) => {
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
        workflow_steps!inner(
          id,
          assigned_user_ids
        )
      `)
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
    }

    if (!claim.current_workflow_step) {
      return NextResponse.json({ success: false, error: 'Claim has no active workflow' }, { status: 400 });
    }

    // Check if user is assigned to current step
    const stepData = claim.workflow_steps;
    const isAssigned = stepData?.assigned_user_ids?.includes(user.id);

    if (!isAssigned && user?.user_metadata?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized to approve/reject this claim' }, { status: 403 });
    }

    // Perform workflow action
    const { data: result, error: actionError } = await supabase.rpc('advance_claim_workflow', {
      p_claim_id: claimId,
      p_action: validatedData.action,
      p_feedback: validatedData.feedback || null,
      p_reviewer_id: user.id
    });

    if (actionError) {
      console.error('[API Claims Workflow] Error performing workflow action:', actionError);
      return handleApiError(actionError, 'Failed to perform workflow action');
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return handleApiError(error, 'Failed to perform workflow action');
  }
});

// GET /api/claims/[id]/workflow - Get workflow status and history
export const GET = withAuth(async (_req: NextRequest, user: User, context: Record<string, unknown>) => {
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
        workflows(
          id,
          name,
          brand_name
        ),
        workflow_steps(
          id,
          name,
          role,
          step_order,
          assigned_user_ids
        )
      `)
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
    }

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

    return NextResponse.json({ 
      success: true, 
      data: {
        claim,
        history: history || []
      }
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch workflow details');
  }
});