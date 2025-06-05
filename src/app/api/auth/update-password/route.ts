import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { password, access_token, refresh_token } = await request.json();

    if (!password || password.trim().length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing access or refresh token.' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      return NextResponse.json(
        { error: `Invalid token session: ${sessionError.message}` },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
} 