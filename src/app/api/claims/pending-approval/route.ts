import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// GET /api/claims/pending-approval - Get claims pending user's approval
export const GET = withAuth(async (_req: NextRequest, user: User) => {
  try {
    if (isBuildPhase()) {
      console.log('[API Claims Pending Approval GET] Build phase: returning empty array.');
      return NextResponse.json({ success: true, isMockData: true, data: [] });
    }

    const supabase = createSupabaseAdminClient();
    
    // Get claims that are assigned to the current user for approval
    const { data: pendingClaims, error } = await supabase
      .from('claims')
      .select(`
        id,
        claim_text,
        claim_type,
        level,
        description,
        workflow_id,
        current_workflow_step,
        workflow_status,
        created_at,
        created_by,
        workflows(
          id,
          name
        ),
        workflow_steps!inner(
          id,
          name,
          role,
          assigned_user_ids
        ),
        profiles!claims_created_by_fkey(
          id,
          full_name
        ),
        master_claim_brands(
          id,
          name
        ),
        products(
          id,
          name
        ),
        ingredients(
          id,
          name
        )
      `)
      .in('workflow_status', ['pending_review', 'in_review'])
      .not('workflow_id', 'is', null)
      .contains('workflow_steps.assigned_user_ids', [user.id])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Claims Pending Approval GET] Error fetching pending claims:', error);
      return handleApiError(error, 'Failed to fetch pending claims');
    }

    // Process the data to flatten nested relationships
    const processedData = (pendingClaims || []).map(claim => ({
      ...claim,
      workflow_name: claim.workflows?.name || null,
      current_step_name: claim.workflow_steps?.name || null,
      current_step_role: claim.workflow_steps?.role || null,
      creator_name: claim.profiles?.full_name || null,
      entity_name: claim.level === 'brand' ? claim.master_claim_brands?.name :
                   claim.level === 'product' ? claim.products?.name :
                   claim.level === 'ingredient' ? claim.ingredients?.name : null,
      // Clean up nested objects
      workflows: undefined,
      workflow_steps: undefined,
      profiles: undefined,
      master_claim_brands: undefined,
      products: undefined,
      ingredients: undefined
    }));

    return NextResponse.json({ success: true, data: processedData });

  } catch (error: unknown) {
    console.error('[API Claims Pending Approval GET] Caught error:', error);
    return handleApiError(error, 'An unexpected error occurred while fetching pending claims.');
  }
});