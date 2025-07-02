import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { processInviteCompletion } from '@/lib/auth/invite-completion-service'; // Import the service
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST: Completes the invite process server-side after user confirms and sets password.
 * This endpoint assigns permissions based on metadata stored during the invite.
 * Requires authentication (user should be logged in after confirming).
 */
export const POST = withAuthAndCSRF(async (request: NextRequest, user: User) => {
  const supabase = createSupabaseAdminClient();
  const result = await processInviteCompletion(user, supabase);

  return NextResponse.json(
    { success: result.success, message: result.message, data: result.data },
    { status: result.httpStatus || (result.success ? 200 : 500) }
  );
}); 