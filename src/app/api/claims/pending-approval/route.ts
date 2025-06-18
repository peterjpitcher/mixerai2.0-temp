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
    
    console.log('[API Claims Pending Approval GET] Current user ID:', user.id);
    
    // First, let's get all pending claims to debug
    const { data: allPendingClaims, error: allError } = await supabase
      .from('claims_pending_approval')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('[API Claims Pending Approval GET] Error fetching all pending claims:', allError);
    } else {
      console.log('[API Claims Pending Approval GET] All pending claims:', allPendingClaims?.length || 0);
      allPendingClaims?.forEach(claim => {
        console.log(`Claim ${claim.id} - Assignees:`, claim.current_step_assignees);
      });
    }
    
    // Get all pending claims (remove user filter to show all claims)
    const { data: pendingClaims, error } = await supabase
      .from('claims_pending_approval')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Claims Pending Approval GET] Error fetching pending claims:', error);
      return handleApiError(error, 'Failed to fetch pending claims');
    }
    
    console.log('[API Claims Pending Approval GET] Total pending claims:', pendingClaims?.length || 0);

    // The view already provides flattened data, so we can return it directly
    // Include the current user ID so frontend can determine which claims they can approve
    return NextResponse.json({ 
      success: true, 
      data: pendingClaims || [],
      currentUserId: user.id 
    });

  } catch (error: unknown) {
    console.error('[API Claims Pending Approval GET] Caught error:', error);
    return handleApiError(error, 'An unexpected error occurred while fetching pending claims.');
  }
});