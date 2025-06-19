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

    // TODO: Get user's notification settings from profile once email_notifications_enabled and email_preferences columns are added
    // For now, return default settings
    const settings = {
      emailNotifications: true,
      contentUpdates: true,
      newComments: true,
      taskReminders: false,
      marketingEmails: false,
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

    // TODO: Update user's notification settings once email_notifications_enabled and email_preferences columns are added
    // For now, just return success
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

    // Get current settings
    // TODO: Get current settings from profile once columns are added
    const currentSettings = {
      emailNotifications: true,
      contentUpdates: true,
      newComments: true,
      taskReminders: false,
      marketingEmails: false,
    };

    // Merge with body
    const updatedSettings = {
      ...currentSettings,
      ...body
    };

    // Map back to database fields
    const emailPreferences = {
      task_assignments: updatedSettings.contentUpdates || updatedSettings.taskReminders,
      workflow_updates: updatedSettings.contentUpdates,
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