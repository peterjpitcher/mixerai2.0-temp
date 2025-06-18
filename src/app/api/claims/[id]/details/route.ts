import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// GET /api/claims/[id]/details - Get detailed claim information including workflow steps and history
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
  console.log('[API Claims Details] Raw context:', context);
  console.log('[API Claims Details] Context type:', typeof context);
  
  const { params } = context as { params: { id: string } };
  const claimId = params?.id;
  
  console.log('[API Claims Details] Params:', params);
  console.log('[API Claims Details] Fetching claim with ID:', claimId);
  console.log('[API Claims Details] User ID:', user.id);

  if (!claimId) {
    console.error('[API Claims Details] No claim ID provided');
    return NextResponse.json({ success: false, error: 'Claim ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Get claim with all related data
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      console.error('[API Claims Details] Error fetching claim:', claimError);
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
    }
    
    console.log('[API Claims Details] Found claim:', claim.id);

    // Get all workflow steps for this workflow
    let workflowSteps: Record<string, unknown>[] = [];
    if (claim.workflow_id) {
      const { data: steps, error: stepsError } = await supabase
        .from('claims_workflow_steps' as never)
        .select('*')
        .eq('workflow_id', claim.workflow_id)
        .order('step_order', { ascending: true });

      if (!stepsError && steps) {
        // Fetch user details for all assigned users
        const allUserIds = (steps as Array<{assigned_user_ids?: string[]}>).flatMap(step => step.assigned_user_ids || []);
        const uniqueUserIds = [...new Set(allUserIds)];
        
        const userMap = new Map();
        if (uniqueUserIds.length > 0) {
          const { data: users } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', uniqueUserIds as string[]);
            
          if (users) {
            users.forEach(user => userMap.set(user.id, user));
          }
        }
        
        // Map steps to include assigned users
        workflowSteps = steps.map((step: Record<string, unknown>) => {
          const assignedUsers = (step.assigned_user_ids as string[] | undefined)?.map(userId => {
            return userMap.get(userId) || { id: userId, email: 'Unknown', full_name: 'Unknown User' };
          }) || [];
          
          return {
            ...step,
            assigned_users: assignedUsers,
            is_current: step.id === claim.current_workflow_step,
            is_completed: ((claim as Record<string, unknown>).completed_workflow_steps as string[] | undefined)?.includes(step.id as string) || false
          };
        });
      }
    }

    // Get workflow history
    const { data: history } = await supabase
      .from('claim_workflow_history')
      .select(`
        *,
        reviewer:profiles!claim_workflow_history_reviewer_id_fkey (id, email, full_name),
        workflow_step:claims_workflow_steps (id, name, step_order)
      `)
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    // Get claim change history (if we track it)
    // Note: claims_history table may not exist yet
    const changeHistory = [];

    return NextResponse.json({ 
      success: true, 
      data: {
        claim,
        workflowSteps,
        history: history || [],
        changeHistory: changeHistory || [],
        currentUserId: user.id
      }
    });

  } catch (error: unknown) {
    console.error('[API Claims Details GET] Caught error:', error);
    return handleApiError(error, 'An unexpected error occurred while fetching claim details.');
  }
});