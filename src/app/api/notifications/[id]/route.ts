import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

// PATCH - Mark a specific notification as read
export const PATCH = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
  try {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const supabase = createSupabaseAdminClient();
    
    // Verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the notification
    const { data: updated, error: updateError } = await supabase
      .from('notifications')
      .update({ 
        is_read: body.is_read || true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notification:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error in notification PATCH:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE - Delete a specific notification (soft delete)
export const DELETE = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
  try {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    // Verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete the notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error in notification DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});