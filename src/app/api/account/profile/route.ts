import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(255, 'Full name must be 255 characters or fewer')
    .optional(),
  company: z
    .string()
    .trim()
    .max(255, 'Company name must be 255 characters or fewer')
    .optional(),
  jobTitle: z
    .string()
    .trim()
    .max(255, 'Job title must be 255 characters or fewer')
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .url('Avatar URL must be a valid URL')
    .nullable()
    .optional(),
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  avatar_url: string | null;
  notification_settings_version?: number | null;
};

async function ensureProfile(userId: string): Promise<ProfileRow> {
  const supabase = createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, company, job_title, avatar_url, notification_settings_version')
    .eq('id', userId)
    .returns<ProfileRow>()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const typedProfile = profile ? (profile as unknown as ProfileRow) : null;
  if (typedProfile) {
    return {
      id: typedProfile.id,
      full_name: typedProfile.full_name ?? null,
      company: typedProfile.company ?? null,
      job_title: typedProfile.job_title ?? null,
      avatar_url: typedProfile.avatar_url ?? null,
      notification_settings_version: typedProfile.notification_settings_version ?? null,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: '',
      company: '',
      job_title: '',
      avatar_url: null,
      notification_settings_version: 0,
    })
    .select('id, full_name, company, job_title, avatar_url, notification_settings_version')
    .single();

  if (insertError) {
    throw insertError;
  }

  const typedCreated = created ? (created as unknown as ProfileRow) : null;
  if (typedCreated) {
    return {
      id: typedCreated.id,
      full_name: typedCreated.full_name ?? null,
      company: typedCreated.company ?? null,
      job_title: typedCreated.job_title ?? null,
      avatar_url: typedCreated.avatar_url ?? null,
      notification_settings_version: typedCreated.notification_settings_version ?? null,
    };
  }

  throw new Error('Failed to create profile record.');
}

export const GET = withAuthAndCSRF(async (req: NextRequest, user) => {
  try {
    const profile = await ensureProfile(user.id);

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        fullName: profile.full_name ?? '',
        company: profile.company ?? '',
        jobTitle: profile.job_title ?? '',
        avatarUrl: profile.avatar_url ?? '',
        email: user.email ?? '',
      },
      notificationVersion: String(profile.notification_settings_version ?? 0),
    });
  } catch (error) {
    console.error('[account/profile] Failed to load profile', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load profile information.' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuthAndCSRF(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseServerClient();
    const rawBody = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid profile payload.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.fullName !== undefined) {
      updates.full_name = payload.fullName;
    }
    if (payload.company !== undefined) {
      updates.company = payload.company;
    }
    if (payload.jobTitle !== undefined) {
      updates.job_title = payload.jobTitle;
    }
    if (payload.avatarUrl !== undefined) {
      updates.avatar_url = payload.avatarUrl;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }
    }

    const profile = await ensureProfile(user.id);

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        fullName: profile.full_name ?? '',
        company: profile.company ?? '',
        jobTitle: profile.job_title ?? '',
        avatarUrl: profile.avatar_url ?? '',
        email: user.email ?? '',
      },
      notificationVersion: String(profile.notification_settings_version ?? 0),
    });
  } catch (error) {
    console.error('[account/profile] Failed to update profile', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile information.' },
      { status: 500 }
    );
  }
});
