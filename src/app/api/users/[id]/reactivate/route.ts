import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuthAndCSRF } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Reactivate user
export const POST = withRouteAuthAndCSRF(async (_request: NextRequest, currentUser: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  
  if (currentUser.user_metadata?.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Only admins can reactivate users' }, { status: 403 });

  try {
    const supabase = createSupabaseAdminClient();

    // Update user metadata to mark as active
    const { error: updateError } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: { status: 'active' }
    });

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Error reactivating user');
  }
});