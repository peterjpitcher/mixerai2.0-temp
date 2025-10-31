import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAuthAndCSRF } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import type { User } from '@supabase/supabase-js';
import { hasProfileUpdates, updateProfileSchema } from './validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileSelect = 'id, full_name, company, job_title, avatar_url';

type ProfileRow = {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  avatar_url: string | null;
};

function toPublicProfile(user: User, profile: ProfileRow | null) {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? '',
    company: profile?.company ?? '',
    jobTitle: profile?.job_title ?? '',
    avatarUrl: profile?.avatar_url ?? '',
  };
}

async function ensureProfile(user: User): Promise<ProfileRow> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: profileData, error } = await supabaseAdmin
    .from('profiles')
    .select(profileSelect)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile = profileData as ProfileRow | null;

  if (profile) {
    return {
      id: profile.id,
      full_name: profile.full_name ?? null,
      company: profile.company ?? null,
      job_title: profile.job_title ?? null,
      avatar_url: profile.avatar_url ?? null,
    };
  }

  const newProfile: ProfileRow = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email || '',
    company: user.user_metadata?.company || '',
    job_title: user.user_metadata?.job_title || '',
    avatar_url: null,
  };

  const { data: createdProfileData, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert(newProfile)
    .select(profileSelect)
    .single();

  if (createError) {
    throw createError;
  }

  return createdProfileData as ProfileRow;
}

export const GET = withAuth(async (_req: NextRequest, user: User) => {
  try {
    const profile = await ensureProfile(user);
    const sanitized = toPublicProfile(user, profile);

    return NextResponse.json({
      success: true,
      profile: sanitized,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to load profile');
  }
});

export const PUT = withAuthAndCSRF(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    if (!hasProfileUpdates(parsed)) {
      return NextResponse.json(
        { success: false, error: 'No profile fields were provided.' },
        { status: 422 }
      );
    }

    const { fullName, company, jobTitle, avatarUrl } = parsed;

    const existingProfile = await ensureProfile(user);

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: updatedProfileData, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName ?? existingProfile.full_name ?? user.email ?? '',
          company: company ?? existingProfile.company ?? '',
          job_title: jobTitle ?? existingProfile.job_title ?? '',
          avatar_url: avatarUrl ?? existingProfile.avatar_url ?? null,
        },
        { onConflict: 'id' }
      )
      .select(profileSelect)
      .single();

    if (error) {
      throw error;
    }

    const metadataUpdates: Record<string, unknown> = { ...(user.user_metadata || {}) };

    if (fullName !== undefined) {
      metadataUpdates.full_name = fullName;
    }
    if (company !== undefined) {
      metadataUpdates.company = company;
    }
    if (jobTitle !== undefined) {
      metadataUpdates.job_title = jobTitle;
    }

    if (fullName !== undefined || company !== undefined || jobTitle !== undefined) {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: metadataUpdates,
      });

      if (metadataError) {
        console.warn('[profile] Failed to update auth metadata', metadataError);
      }
    }

    const updatedProfile = (updatedProfileData ?? existingProfile) as ProfileRow;
    const responseProfile = toPublicProfile(user, updatedProfile);

    return NextResponse.json({
      success: true,
      profile: responseProfile,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update profile');
  }
});
