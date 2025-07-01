import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth, withRouteAuthAndCSRF } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';
// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET a single user by ID
export const GET = withRouteAuth(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const isViewingOwnProfile = user.id === params.id;
    const isGlobalAdmin = user.user_metadata?.role === 'admin';

    // A user can view their own profile, or a global admin can view any profile.
    // Future enhancement: Allow brand admins to view profiles of users within their brand.
    if (!isViewingOwnProfile && !isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this user profile.' },
        { status: 403 }
      );
    }

    const { data: userDetails, error: rpcError } = await supabase
      .rpc('get_user_details', { p_user_id: params.id })
      .single();
    
    if (rpcError) throw rpcError;

    if (!userDetails || typeof userDetails !== 'object') {
      return NextResponse.json({ success: false, error: 'User not found or invalid data format' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...userDetails,
        is_current_user: isViewingOwnProfile
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching user');
  }
});

// Update user
export const PUT = withRouteAuthAndCSRF(async (request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();

    const isSelf = user.id === params.id;
    const isGlobalAdmin = user.user_metadata?.role === 'admin';

    if (!isSelf && !isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this user.' },
        { status: 403 }
      );
    }

    // Log the request data for debugging
    console.log('Update user request:', {
      userId: params.id,
      isGlobalAdmin,
      body,
    });

    // Prepare RPC parameters
    const rpcParams: {
      p_user_id: string;
      p_full_name: string;
      p_job_title: string;
      p_company: string;
      p_role?: string;
      p_brand_permissions?: Array<{ brand_id: string; role: string }>;
    } = {
      p_user_id: params.id,
      p_full_name: body.full_name || '',
      p_job_title: body.job_title || '',
      p_company: body.company || '',
    };

    // Only include role and brand_permissions if user is global admin
    if (isGlobalAdmin) {
      rpcParams.p_role = body.role || undefined;
      // Ensure role values in brand_permissions are valid enum values
      if (body.brand_permissions && Array.isArray(body.brand_permissions)) {
        const validRoles = ['admin', 'editor', 'viewer'];
        rpcParams.p_brand_permissions = body.brand_permissions.map((perm: Record<string, unknown>) => ({
          brand_id: perm.brand_id,
          role: validRoles.includes(perm.role as string) ? perm.role : 'viewer' // Default to viewer if invalid
        }));
      } else {
        rpcParams.p_brand_permissions = undefined;
      }
    }

    console.log('RPC params:', rpcParams);

    const { error: rpcError } = await supabase.rpc('update_user_details', rpcParams);

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw rpcError;
    }

    const { data: updatedUserDetails, error: fetchError } = await supabase
      .rpc('get_user_details', { p_user_id: params.id })
      .single();

    if (fetchError) throw fetchError;

    if (!updatedUserDetails || typeof updatedUserDetails !== 'object') {
      return NextResponse.json({ success: false, error: 'User not found after update or invalid data format' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUserDetails,
        is_current_user: isSelf
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error updating user');
  }
});

// Delete user
export const DELETE = withRouteAuthAndCSRF(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();

    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account.' },
        { status: 403 }
      );
    }
    
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete users.' },
        { status: 403 }
      );
    }
    
    const { error: rpcError } = await supabase.rpc('delete_user_and_reassign_tasks', {
      p_user_id_to_delete: params.id,
    });

    if (rpcError) throw rpcError;
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting user');
  }
}); 