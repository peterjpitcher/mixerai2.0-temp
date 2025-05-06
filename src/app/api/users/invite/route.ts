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
    
    // Verify email templates in development mode
    await verifyEmailTemplates();
    
    // Validate required fields
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
    
    // Check if the role is valid
    if (!['admin', 'editor', 'viewer'].includes(body.role.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      );
    }
    
    // Check if the current user has admin permissions
    const { data: userPermissions, error: permissionCheckError } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    
    if (permissionCheckError) {
      throw permissionCheckError;
    }
    
    // If the user has no admin role, reject the invitation request
    if (!userPermissions || userPermissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can invite users' },
        { status: 403 }
      );
    }
    
    // Send the invitation via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(body.email, {
      data: {
        full_name: body.full_name || '',
        role: body.role.toLowerCase(),
        invited_by: user.id // Track who sent the invitation
      }
    });
    
    if (error) {
      // Check if it's an already-invited user error
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      throw error;
    }
    
    // If a brand_id is provided, assign the user to that brand with the specified role
    if (body.brand_id && data.user) {
      // Insert a record in the user_brand_permissions table
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .insert([
          {
            user_id: data.user.id,
            brand_id: body.brand_id,
            role: body.role.toLowerCase(),
            assigned_by: user.id // Track who assigned the permission
          }
        ]);
      
      if (permissionError) {
        console.error('Error assigning brand to user:', permissionError);
        // Don't fail the whole operation if brand assignment fails
        // We'll still return success but with a warning
        return NextResponse.json({ 
          success: true, 
          message: 'Invitation sent successfully, but brand assignment failed',
          warning: 'Failed to assign user to the selected brand',
          data
        });
      }
    }
    
    // Log the successful invitation
    console.log(`User ${user.id} invited ${body.email} with role ${body.role}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      data
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return handleApiError(error, 'Failed to invite user');
  }
}); 