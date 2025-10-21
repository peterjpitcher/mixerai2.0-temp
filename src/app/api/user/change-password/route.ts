import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const POST = withAuthAndCSRF(async (request: NextRequest, user: User) => {
  try {
    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'Unable to verify your account email.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to change password');
  }
});
