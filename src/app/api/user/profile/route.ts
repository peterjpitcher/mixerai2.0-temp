import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAuthAndCSRF } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileSelect = 'full_name, company, job_title, avatar_url';

async function ensureProfile(user: User) {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(`${profileSelect}, email_notifications_enabled, email_preferences`)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile) {
    return profile;
  }

  const newProfile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email || '',
    company: user.user_metadata?.company || '',
    job_title: user.user_metadata?.job_title || '',
    avatar_url: null,
  };

  const { data: createdProfile, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert(newProfile)
    .select(`${profileSelect}, email_notifications_enabled, email_preferences`)
    .single();

  if (createError) {
    throw createError;
  }

  return createdProfile;
}

export const GET = withAuth(async (_req: NextRequest, user: User) => {
  try {
    const profile = await ensureProfile(user);

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email ?? '',
        fullName: profile.full_name ?? '',
        company: profile.company ?? '',
        jobTitle: profile.job_title ?? '',
        avatarUrl: profile.avatar_url ?? '',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to load profile');
  }
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').optional(),
  company: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  avatarUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal('').transform(() => null))
    .or(z.null())
    .optional(),
});

export const PUT = withAuthAndCSRF(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    if (
      parsed.fullName === undefined &&
      parsed.company === undefined &&
      parsed.jobTitle === undefined &&
      parsed.avatarUrl === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'No profile fields were provided.' },
        { status: 422 }
      );
    }

    const { fullName, company, jobTitle, avatarUrl } = parsed;

    const existingProfile = await ensureProfile(user);

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: updatedProfile, error } = await supabaseAdmin
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

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email ?? '',
        fullName: updatedProfile?.full_name ?? existingProfile.full_name ?? '',
        company: updatedProfile?.company ?? '',
        jobTitle: updatedProfile?.job_title ?? '',
        avatarUrl: updatedProfile?.avatar_url ?? '',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update profile');
  }
});
