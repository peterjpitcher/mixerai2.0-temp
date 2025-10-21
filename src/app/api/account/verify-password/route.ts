import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

const VerifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  try {
    const body = await request.json().catch(() => null);
    const validation = VerifyPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'Unable to verify password for this account.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: validation.data.password,
    });

    if (error || !data?.session) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[account/verify-password] Failed to verify password', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify password.' },
      { status: 500 }
    );
  }
});
