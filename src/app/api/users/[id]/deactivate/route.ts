import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuthAndCSRF } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Deactivate user
export const POST = withRouteAuthAndCSRF(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();

    // Check permissions
    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own account.' },
        { status: 403 }
      );
    }
    
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to deactivate users.' },
        { status: 403 }
      );
    }

    // Update user status to inactive
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ user_status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) throw updateError;

    // Get the updated user details
    const { data: updatedUser, error: fetchError } = await supabase
      .rpc('get_user_details', { p_user_id: params.id })
      .single();

    if (fetchError) throw fetchError;
    
    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
      user: updatedUser
    });
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

    // Update user status to active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ user_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) throw updateError;

    // Get the updated user details
    const { data: updatedUser, error: fetchError } = await supabase
      .rpc('get_user_details', { p_user_id: params.id })
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