import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { getUserAuthByEmail } from '@/lib/auth/user-management';

export const POST = withAdminAuthAndCSRF(async function (request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Determine the application URL for the redirect
    // Try multiple sources for the URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (host ? `${protocol}://${host}` : 'http://localhost:3000');
    const confirmRedirect = `${appUrl}/auth/confirm`;
    const updatePasswordRedirect = `${appUrl}/auth/update-password`;

    console.log('Resending invite to:', email);

    const user = await getUserAuthByEmail(email.toLowerCase(), supabaseAdmin);
    
    if (!user) {
      // User doesn't exist, need to invite them first
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: confirmRedirect,
      });
      
      if (inviteError) {
        console.error('Error inviting user:', inviteError);
        return handleApiError(inviteError, 'Failed to send invitation');
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'New invitation sent successfully.' 
      });
    }

    // User exists, check if they're already confirmed
    if (user.email_confirmed_at) {
      // User already confirmed, send a password reset instead
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: updatePasswordRedirect,
      });
      
      if (resetError) {
        console.error('Error sending password reset:', resetError);
        return handleApiError(resetError, 'Failed to send password reset');
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email sent (user already confirmed).' 
      });
    }

    // User exists but not confirmed, resend the signup confirmation
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: confirmRedirect,
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
