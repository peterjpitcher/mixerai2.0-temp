import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

// GET all notifications for the current user
export const GET = withAuth(async (req: NextRequest, user: User) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .or('is_archived.eq.false,is_archived.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Get unread count
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications || [],
        unread_count: unreadCount
      }
    });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - Create a new notification (usually called by system/other APIs)
export const POST = withAuthAndCSRF(async (req: NextRequest, user: User) => {
  try {
    const body = await req.json();
    const supabase = createSupabaseAdminClient();
    
    // Validate required fields
    if (!body.type || !body.title || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: body.user_id || user.id, // Allow creating notifications for other users if admin
        type: body.type,
        title: body.title,
        message: body.message,
        action_label: body.action_label,
        action_url: body.action_url,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PATCH - Mark all notifications as read
export const PATCH = withAuthAndCSRF(async (req: NextRequest, user: User) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error in notifications PATCH:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE - Clear all notifications (soft delete)
export const DELETE = withAuthAndCSRF(async (req: NextRequest, user: User) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Delete all notifications for the user
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error archiving notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clear notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Error in notifications DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});