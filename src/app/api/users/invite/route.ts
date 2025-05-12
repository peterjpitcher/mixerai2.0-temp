import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAdminAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { verifyEmailTemplates } from '@/lib/auth/email-templates';

/**
 * POST endpoint to invite a new user
 * Only global administrators can invite users.
 */
export const POST = withAdminAuth(async (request: NextRequest, adminUser) => {
  console.log('[API /api/users/invite] Received POST request');
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    console.log('[API /api/users/invite] Request body:', JSON.stringify(body));
    
    console.log('[API /api/users/invite] Verifying email templates...');
    await verifyEmailTemplates();
    console.log('[API /api/users/invite] Email templates verified.');
    
    if (!body.email) {
      console.error('[API /api/users/invite] Error: Email is required');
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!body.role) {
      console.error('[API /api/users/invite] Error: Role is required');
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      );
    }
    
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(body.role.toLowerCase())) {
      console.error(`[API /api/users/invite] Error: Invalid role - ${body.role}`);
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }
    
    console.log(`[API /api/users/invite] Attempting to invite user: ${body.email} by admin: ${adminUser.id}`);
    const invitePayload = {
      email: body.email,
      options: {
        data: {
          full_name: body.full_name || '',
          job_title: body.job_title || '',
          company: body.company || '',
          role: body.role.toLowerCase(),
          invited_by: adminUser.id
        },
      }
    };
    console.log('[API /api/users/invite] Supabase invite payload:', JSON.stringify(invitePayload));

    const { data: inviteData, error: inviteErrorData } = await supabase.auth.admin.inviteUserByEmail(
      invitePayload.email,
      invitePayload.options
    );
    
    if (inviteErrorData) {
      console.error(`[API /api/users/invite] Error inviting user ${body.email}:`, JSON.stringify(inviteErrorData));
      if (inviteErrorData.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists or has been invited' },
          { status: 409 }
        );
      }
      throw inviteErrorData;
    }
    console.log(`[API /api/users/invite] Successfully invited user ${body.email}. Invite data:`, JSON.stringify(inviteData));
    
    if (body.brand_id && inviteData?.user) {
      console.log(`[API /api/users/invite] Assigning user ${inviteData.user.id} to brand ${body.brand_id}`);
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .insert([
          {
            user_id: inviteData.user.id,
            brand_id: body.brand_id,
            role: body.role.toLowerCase(),
          }
        ]);
      
      if (permissionError) {
        console.warn(`[API /api/users/invite] Failed to assign user ${inviteData.user.id} to brand ${body.brand_id}:`, JSON.stringify(permissionError));
        return NextResponse.json({ 
          success: true, 
          data: {
            user: inviteData.user,
            message: 'Invitation sent successfully, but brand assignment failed.',
            warning: `Failed to assign user to the selected brand: ${permissionError.message}`
          }
        });
      }
      console.log(`[API /api/users/invite] Successfully assigned user ${inviteData.user.id} to brand ${body.brand_id}`);
    }
    
    console.log('[API /api/users/invite] Invitation process completed successfully.');
    return NextResponse.json({ 
      success: true, 
      data: { 
        user: inviteData.user,
        message: 'Invitation sent successfully'
      }
    });
  } catch (error: any) {
    console.error('[API /api/users/invite] Unhandled error in POST handler:', error);
    return handleApiError(error, 'Failed to invite user');
  }
}); 