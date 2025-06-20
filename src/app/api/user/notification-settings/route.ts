import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's notification preferences from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, email_preferences')
      .eq('id', user.id)
      .single();
      
    const emailPrefs = profile?.email_preferences as any || {};
    const settings = {
      emailNotifications: profile?.email_notifications_enabled ?? true,
      contentUpdates: emailPrefs.content_approved !== false && emailPrefs.content_rejected !== false,
      newComments: emailPrefs.comments_mentions ?? true,
      taskReminders: emailPrefs.deadline_reminders ?? false,
      marketingEmails: emailPrefs.marketing ?? false,
    };

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch notification settings' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const emailPreferences = {
      content_approved: body.contentUpdates ?? true,
      content_rejected: body.contentUpdates ?? true,
      workflow_assigned: body.contentUpdates ?? true,
      workflow_completed: body.contentUpdates ?? true,
      brand_invitation: true,
      weekly_summary: body.marketingEmails ?? false,
      deadline_reminders: body.taskReminders ?? false,
      comments_mentions: body.newComments ?? true,
      marketing: body.marketingEmails ?? false
    };

    // Update user's notification settings in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        email_notifications_enabled: body.emailNotifications ?? true,
        email_preferences: emailPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save notification settings' 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updatedSettings = {
      emailNotifications: body.emailNotifications ?? true,
      contentUpdates: body.contentUpdates ?? true,
      newComments: body.newComments ?? true,
      taskReminders: body.taskReminders ?? false,
      marketingEmails: body.marketingEmails ?? false,
    };

    const emailPreferences = {
      content_approved: updatedSettings.contentUpdates,
      content_rejected: updatedSettings.contentUpdates,
      workflow_assigned: updatedSettings.contentUpdates,
      workflow_completed: updatedSettings.contentUpdates,
      brand_invitation: true,
      weekly_summary: updatedSettings.marketingEmails,
      deadline_reminders: updatedSettings.taskReminders,
      comments_mentions: updatedSettings.newComments,
      marketing: updatedSettings.marketingEmails
    };

    // Update user's notification settings in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        email_notifications_enabled: updatedSettings.emailNotifications,
        email_preferences: emailPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preference updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update notification settings' 
      },
      { status: 500 }
    );
  }
}