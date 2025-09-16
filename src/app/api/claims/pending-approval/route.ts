import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { ok } from '@/lib/http/response';

export const dynamic = "force-dynamic";

// GET /api/claims/pending-approval - Get claims pending user's approval
export const GET = withAuth(async (_req: NextRequest, user: User) => {
  try {
    if (isBuildPhase()) return ok([]);

    const supabase = createSupabaseAdminClient();
    
    // Get pending claims where the current user is an assignee
    const { data: pendingClaims, error } = await supabase
      .from('claims_pending_approval')
      .select('*')
      .contains('current_step_assignees', [user.id])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Claims Pending Approval GET] Error fetching pending claims:', error);
      return handleApiError(error, 'Failed to fetch pending claims');
    }
    return ok({ items: pendingClaims || [], currentUserId: user.id });

  } catch (error: unknown) {
    console.error('[API Claims Pending Approval GET] Caught error:', error);
    return handleApiError(error, 'An unexpected error occurred while fetching pending claims.');
  }
});
