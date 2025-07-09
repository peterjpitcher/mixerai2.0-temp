import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { Database } from '@/types/supabase';
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

// Initialize Supabase client with SERVICE_ROLE_KEY for admin actions
// Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment variables
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const POST = withAdminAuthAndCSRF(async function (request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    // Determine the application URL for the redirect
    // Ensure NEXT_PUBLIC_APP_URL is set in your environment, e.g., http://localhost:3000 or your production URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/auth/confirm`; // Or your desired confirmation/welcome page

    // Resend the signup confirmation email. 
    // This is suitable if the user was created (e.g., via inviteUserByEmail or direct creation)
    // but has not confirmed their email / signed up yet.
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup', // Use 'signup' to resend the initial confirmation for an existing invited user
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('Error resending invite:', error);
      // Check for specific errors, e.g., if user has already confirmed
      if (error.message.includes('User is already confirmed')) {
        return NextResponse.json({ success: false, error: 'User has already confirmed their email.' }, { status: 400 });
      }
      if (error.message.includes('User not found')) {
        return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Failed to resend invitation.' }, { status: 500 });
    }

    // The resend method itself doesn't return much user data, typically just an error or null.
    // Success is implied if no error is thrown.
    return NextResponse.json({ success: true, message: 'Invitation resent successfully.' });

  } catch (error: unknown) {
    console.error('Unexpected error in resend-invite route:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 });
  }
}); 