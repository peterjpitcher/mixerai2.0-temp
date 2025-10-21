import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuthAndCSRF } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Deactivate user
export const POST = withRouteAuthAndCSRF(async (_request: NextRequest, currentUser: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  
  if (currentUser.user_metadata?.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Only admins can deactivate users' }, { status: 403 });

  if (currentUser.id === params.id)
    return NextResponse.json({ success: false, error: 'You cannot deactivate your own account' }, { status: 400 });

  try {
    const supabase = createSupabaseAdminClient();

    // Update user metadata to mark as inactive
    const { error: updateError } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: { status: 'inactive' }
    });

    if (updateError) throw updateError;

    // Kill existing sessions - best effort
    try { 
      await supabase.auth.admin.signOut(params.id);
    } catch { /* best-effort */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Error deactivating user');
  }
});

// Reactivate user
export const DELETE = withRouteAuthAndCSRF(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();

    // Check permissions
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to reactivate users.' },
        { status: 403 }
      );
    }

    // Update user metadata to mark as active
    const { error: updateError } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: { status: 'active' }
    });

    if (updateError) throw updateError;

    // Get the updated user details
    const { data: updatedUser, error: fetchError } = await supabase
      .rpc('get_user_details' as never, { p_user_id: params.id } as never)
      .single();

    if (fetchError) throw fetchError;
    
    return NextResponse.json({
      success: true,
      message: 'User reactivated successfully',
      user: updatedUser
    });
  } catch (error) {
    return handleApiError(error, 'Error reactivating user');
  }
});
