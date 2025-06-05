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

    // Use an admin client to perform these operations
    const supabase = createSupabaseAdminClient();

    // 1. Establish a session on the backend using the tokens from the client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      console.error('[API update-password] setSession error:', sessionError);
      return NextResponse.json(
        { error: `Invalid token: ${sessionError.message}` },
        { status: 401 }
      );
    }

    // 2. Now that the session is set, we have an authenticated user context
    // to perform the password update.
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('[API update-password] updateUser error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in update-password API route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the password.' },
      { status: 500 }
    );
  }
} 