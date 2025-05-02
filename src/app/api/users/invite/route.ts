import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

/**
 * POST endpoint to invite a new user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
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
    
    // Send the invitation via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(body.email, {
      data: {
        full_name: body.full_name || '',
        role: body.role.toLowerCase()
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
            role: body.role.toLowerCase()
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
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      data
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to invite user' },
      { status: 500 }
    );
  }
} 