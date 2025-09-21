import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { buildPreferences, mapProfileToSettings, NotificationSettingsSchema } from './helpers';

async function fetchProfile(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email_notifications_enabled, email_preferences, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export const GET = withAuthAndCSRF(async function (req: NextRequest, user: User) {
  try {
    const supabase = createSupabaseServerClient();
    const profile = await fetchProfile(supabase, user.id);

    const settings = mapProfileToSettings(profile ?? {
      email_notifications_enabled: true,
      email_preferences: null,
    });

    const version = profile?.updated_at ?? 'null';

    const response = NextResponse.json({
      success: true,
      data: settings,
      version,
    });
    response.headers.set('ETag', version);
    return response;
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
});

export const POST = withAuthAndCSRF(async function (request: NextRequest, user: User) {
  try {
    const supabase = createSupabaseServerClient();
    const rawBody = await request.json();
    const parseResult = NotificationSettingsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const body = parseResult.data;

    const ifMatch = request.headers.get('if-match');
    if (!ifMatch) {
      return NextResponse.json(
        { success: false, error: 'Missing If-Match header for concurrency control.' },
        { status: 428 }
      );
    }

    const profile = await fetchProfile(supabase, user.id);
    const currentVersion = profile?.updated_at ?? 'null';

    if (ifMatch !== currentVersion && ifMatch !== '*') {
      return NextResponse.json(
        { success: false, error: 'Notification settings have been modified by another session.' },
        { status: 412 }
      );
    }

    const targetSettings = {
      emailNotifications: body.emailNotifications ?? true,
      contentUpdates: body.contentUpdates ?? true,
      newComments: body.newComments ?? true,
      taskReminders: body.taskReminders ?? false,
      marketingEmails: body.marketingEmails ?? false,
    };

    const emailPreferences = buildPreferences(targetSettings);

    const updated_at = new Date().toISOString();

    let updatedProfile;
    if (profile) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email_notifications_enabled: targetSettings.emailNotifications,
          email_preferences: emailPreferences,
          updated_at,
        })
        .eq('id', user.id)
        .select('email_notifications_enabled, email_preferences, updated_at')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email_notifications_enabled: targetSettings.emailNotifications,
          email_preferences: emailPreferences,
          updated_at,
        })
        .select('email_notifications_enabled, email_preferences, updated_at')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    }

    const settings = mapProfileToSettings(updatedProfile);
    const response = NextResponse.json({
      success: true,
      data: settings,
      version: updatedProfile.updated_at ?? 'null',
    });
    response.headers.set('ETag', updatedProfile.updated_at ?? 'null');
    return response;
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
});

export const PATCH = withAuthAndCSRF(async function (request: NextRequest, user: User) {
  try {
    const supabase = createSupabaseServerClient();
    const rawBody = await request.json();
    const parseResult = NotificationSettingsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const body = parseResult.data;

    const ifMatch = request.headers.get('if-match');
    if (!ifMatch) {
      return NextResponse.json(
        { success: false, error: 'Missing If-Match header for concurrency control.' },
        { status: 428 }
      );
    }

    const profile = await fetchProfile(supabase, user.id);
    const currentVersion = profile?.updated_at ?? 'null';

    if (ifMatch !== currentVersion && ifMatch !== '*') {
      return NextResponse.json(
        { success: false, error: 'Notification settings have been modified by another session.' },
        { status: 412 }
      );
    }

    const existingSettings = mapProfileToSettings(profile ?? {
      email_notifications_enabled: true,
      email_preferences: null,
    });

    const updatedSettings = {
      emailNotifications: body.emailNotifications ?? existingSettings.emailNotifications,
      contentUpdates: body.contentUpdates ?? existingSettings.contentUpdates,
      newComments: body.newComments ?? existingSettings.newComments,
      taskReminders: body.taskReminders ?? existingSettings.taskReminders,
      marketingEmails: body.marketingEmails ?? existingSettings.marketingEmails,
    };

    const emailPreferences = buildPreferences(updatedSettings);
    const updated_at = new Date().toISOString();

    let updatedProfile;
    if (profile) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email_notifications_enabled: updatedSettings.emailNotifications,
          email_preferences: emailPreferences,
          updated_at,
        })
        .eq('id', user.id)
        .select('email_notifications_enabled, email_preferences, updated_at')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email_notifications_enabled: updatedSettings.emailNotifications,
          email_preferences: emailPreferences,
          updated_at,
        })
        .select('email_notifications_enabled, email_preferences, updated_at')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    }

    const settings = mapProfileToSettings(updatedProfile);
    const response = NextResponse.json({
      success: true,
      data: settings,
      version: updatedProfile.updated_at ?? 'null',
    });
    response.headers.set('ETag', updatedProfile.updated_at ?? 'null');
    return response;
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
})
