import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { verifyEmailTemplates } from '@/lib/auth/email-templates';

/**
 * POST endpoint to invite a new user
 * Only users with admin role can invite others
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    // The necessity of calling this on every invite should be reviewed.
    // If it's a heavy operation or mainly for dev, consider conditional execution.
    await verifyEmailTemplates();
    
    if (!body.email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!body.role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      );
    }
    
    if (!['admin', 'editor', 'viewer'].includes(body.role.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      );
    }
    
    const { data: userPermissions, error: permissionCheckError } = await supabase
      .from('user_brand_permissions')
      .select('role', {count: 'exact'}) // Added count for a more reliable check
      .eq('user_id', user.id)
      .eq('role', 'admin');
    
    if (permissionCheckError) {
      throw permissionCheckError;
    }
    
    if (!userPermissions || userPermissions.length === 0) { // Check length for admin roles
      return NextResponse.json(
        { success: false, error: 'Only administrators can invite users' },
        { status: 403 }
      );
    }
    
    const { data: inviteData, error: inviteErrorData } = await supabase.auth.admin.inviteUserByEmail(body.email, { // Renamed data and error
      data: {
        full_name: body.full_name || '',
        job_title: body.job_title || '',
        company: body.company || '',
        role: body.role.toLowerCase(),
        invited_by: user.id
      }
    });
    
    if (inviteErrorData) {
      if (inviteErrorData.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists or has been invited' }, // Clarified error
          { status: 409 }
        );
      }
      throw inviteErrorData;
    }
    
    if (body.brand_id && inviteData?.user) { // Ensure inviteData.user exists
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .insert([
          {
            user_id: inviteData.user.id,
            brand_id: body.brand_id,
            role: body.role.toLowerCase(),
            assigned_by: user.id
          }
        ]);
      
      if (permissionError) {
        // This error is significant enough to report more directly if desired.
        // For now, returning a specific warning as per original logic.
        return NextResponse.json({ 
          success: true, 
          message: 'Invitation sent successfully, but brand assignment failed.',
          warning: `Failed to assign user to the selected brand: ${permissionError.message}`,
          data: inviteData
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      data: inviteData
    });
  } catch (error) {
    return handleApiError(error, 'Failed to invite user');
  }
}); 