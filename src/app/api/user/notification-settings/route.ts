import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { buildPreferences, mapProfileToSettings, NotificationSettingsSchema } from './helpers';

type ProfileSettingsRow = {
  email_notifications_enabled: boolean | null;
  email_preferences: unknown;
  notification_settings_version?: number | null;
};

async function fetchProfile(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email_notifications_enabled, email_preferences, notification_settings_version')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as unknown as ProfileSettingsRow | null;
}

export const GET = withAuthAndCSRF(async function (req: NextRequest, user: User) {
  try {
    const supabase = createSupabaseServerClient();
    const profile = await fetchProfile(supabase, user.id);

    const settings = mapProfileToSettings(profile ?? {
      email_notifications_enabled: true,
      email_preferences: null,
    });

    const version = profile ? String(profile.notification_settings_version ?? 0) : '0';

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
    const currentVersion = profile ? Number(profile.notification_settings_version ?? 0) : 0;
    const ifMatchVersion = (() => {
      if (ifMatch === '*') return currentVersion;
      if (ifMatch === 'null') return 0;
      const parsed = Number(ifMatch);
      return Number.isFinite(parsed) ? parsed : NaN;
    })();

    if (!Number.isFinite(ifMatchVersion) || (ifMatch !== '*' && ifMatchVersion !== currentVersion)) {
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
    const nextVersion = currentVersion + 1;

    let updatedProfile;
    if (profile) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email_notifications_enabled: targetSettings.emailNotifications,
          email_preferences: emailPreferences,
          notification_settings_version: nextVersion,
        })
        .eq('id', user.id)
        .select('email_notifications_enabled, email_preferences, notification_settings_version')
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
          notification_settings_version: 1,
        })
        .select('email_notifications_enabled, email_preferences, notification_settings_version')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    }

    const settings = mapProfileToSettings(updatedProfile);
    const versionValue = String(updatedProfile?.notification_settings_version ?? nextVersion);
    const response = NextResponse.json({
      success: true,
      data: settings,
      version: versionValue,
    });
    response.headers.set('ETag', versionValue);
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
    const currentVersion = profile ? Number(profile.notification_settings_version ?? 0) : 0;
    const ifMatchVersion = (() => {
      if (ifMatch === '*') return currentVersion;
      if (ifMatch === 'null') return 0;
      const parsed = Number(ifMatch);
      return Number.isFinite(parsed) ? parsed : NaN;
    })();

    if (!Number.isFinite(ifMatchVersion) || (ifMatch !== '*' && ifMatchVersion !== currentVersion)) {
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
    const nextVersion = currentVersion + 1;

    let updatedProfile;
    if (profile) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email_notifications_enabled: updatedSettings.emailNotifications,
          email_preferences: emailPreferences,
          notification_settings_version: nextVersion,
        })
        .eq('id', user.id)
        .select('email_notifications_enabled, email_preferences, notification_settings_version')
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
          notification_settings_version: 1,
        })
        .select('email_notifications_enabled, email_preferences, notification_settings_version')
        .single();

      if (error) {
        throw error;
      }
      updatedProfile = data;
    }

    const settings = mapProfileToSettings(updatedProfile);
    const versionValue = String(updatedProfile?.notification_settings_version ?? nextVersion);
    const response = NextResponse.json({
      success: true,
      data: settings,
      version: versionValue,
    });
    response.headers.set('ETag', versionValue);
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
