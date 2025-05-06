# MixerAI 2.0 Invitation System: Simplified Implementation Plan

This document outlines a simplified approach to the MixerAI 2.0 invitation system based on the current codebase structure. The goal is to streamline the user invitation and sign-up process by removing unnecessary complexity while maintaining essential functionality.

## 1. Database Setup

### a. Add Invitation Logs Table

Create a dedicated table to track invitation attempts for better monitoring and troubleshooting:

```sql
-- migrations/create-invitation-logs-table.sql
CREATE TABLE IF NOT EXISTS invitation_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          TEXT NOT NULL,
  success        BOOLEAN NOT NULL,
  error_message  TEXT,
  invited_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id       UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster querying by email
CREATE INDEX idx_invitation_logs_email ON invitation_logs(email);
```

### b. Verify Profiles Table Trigger

Confirm that the existing trigger to auto-create a `public.profiles` row on `auth.users` insert is working correctly:

```sql
-- migrations/verify-profile-creation-trigger.sql
-- This should already exist but verify it's working correctly

-- Check if the trigger exists
SELECT 
  tgname AS trigger_name, 
  proname AS function_name,
  tgenabled AS trigger_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
AND tgname = 'on_auth_user_created';

-- If the trigger doesn't exist, create it
-- This is just a check - the trigger should already be in place
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Warning: profile creation trigger not found. It should be created.';
  ELSE
    RAISE NOTICE 'Profile creation trigger exists.';
  END IF;
END $$;
```

## 2. Simplified API Route Implementation

### Refactor the Invitation API Route

Update the existing invitation API route to use the simplified approach:

```typescript
// src/app/api/users/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuth } from '@/lib/auth/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  const supabase = createSupabaseAdminClient();
  const body = await request.json();
  const { email, role, brand_id, full_name, job_title } = body;

  // 1. Basic validation
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Email is required' },
      { status: 400 }
    );
  }

  if (!role) {
    return NextResponse.json(
      { success: false, error: 'Role is required' },
      { status: 400 }
    );
  }

  const normalizedRole = role.toLowerCase();
  if (!['admin', 'editor', 'viewer'].includes(normalizedRole)) {
    return NextResponse.json(
      { success: false, error: 'Invalid role. Must be admin, editor, or viewer' },
      { status: 400 }
    );
  }

  // 2. Permission check
  try {
    const { data: userPermissions, error: permissionCheckError } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    
    if (permissionCheckError) {
      throw permissionCheckError;
    }
    
    if (!userPermissions || userPermissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can invite users' },
        { status: 403 }
      );
    }
  } catch (error) {
    // In development mode, bypass admin check for testing
    if (process.env.NODE_ENV !== 'development') {
      console.error('Permission check error:', error);
      return NextResponse.json(
        { success: false, error: 'Error checking permissions' },
        { status: 500 }
      );
    }
  }

  // 3. Prevent duplicates
  try {
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();
    
    if (userCheckError) {
      console.warn('Error checking existing user:', userCheckError);
    }
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }
  } catch (userCheckErr) {
    console.warn('User check error:', userCheckErr);
  }

  // 4. Invite via Supabase
  let inviteError: any = null;
  let inviteSuccess = false;
  let userData = null;
  
  try {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || '',
        role: normalizedRole,
        invited_by: user.id,
        job_title: job_title || ''
      }
    });
    
    if (error) {
      inviteError = error;
    } else {
      inviteSuccess = true;
      userData = data;
    }
  } catch (err: any) {
    inviteError = err;
    console.error('Invitation error:', err);
  }

  // 5. Brand assignment (if invitation succeeded)
  if (brand_id && inviteSuccess && userData?.user) {
    try {
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .insert([
          {
            user_id: userData.user.id,
            brand_id: brand_id,
            role: normalizedRole,
            assigned_by: user.id
          }
        ]);
      
      if (permissionError) {
        console.error('Error assigning brand to user:', permissionError);
      }
    } catch (brandAssignErr) {
      console.error('Brand assignment error:', brandAssignErr);
    }
  } else if (brand_id && inviteSuccess && !userData?.user) {
    // Create a placeholder record to be filled later
    try {
      await supabase.from('user_brand_permissions').insert({
        user_id: null,           // Will be populated when user completes registration
        brand_id,
        role: normalizedRole,
        assigned_by: user.id
      });
    } catch (placeholderErr) {
      console.error('Error creating brand placeholder:', placeholderErr);
    }
  }

  // 6. Log the attempt
  try {
    await supabase.from('invitation_logs').insert({
      email,
      success: inviteSuccess,
      error_message: inviteError ? (inviteError.message || JSON.stringify(inviteError)) : null,
      invited_by: user.id,
      brand_id: brand_id || null
    });
  } catch (logErr) {
    console.error('Error logging invitation:', logErr);
  }

  // 7. Response
  if (!inviteSuccess) {
    return NextResponse.json({ 
      success: false, 
      error: inviteError?.message || 'Invitation failed',
      errorDetails: inviteError
    }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Invitation sent successfully',
    data: userData
  });
});
```

## 3. Lightweight Sign-Up Form Improvement

### Update the Auth Confirmation Page

Improve the existing auth confirmation page to handle the invitation flow more seamlessly:

```typescript
// src/app/auth/confirm/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'invite';
  
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Verify the token is present
    if (!token) {
      setError('Missing confirmation token. Please check your invitation link.');
    }
  }, [token]);
  
  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Confirm the user's email with the token
      const { data, error: confirmError } = await supabase.auth.verifyOtp({
        token_hash: token as string,
        type: type === 'invite' ? 'invite' : 'signup',
      });
      
      if (confirmError) throw confirmError;
      
      // Update the user's profile with additional information
      if (data?.user) {
        // Update the user's profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            job_title: jobTitle,
            updated_at: new Date().toISOString()
          });
        
        if (profileError) throw profileError;
        
        // Update any pending brand assignments
        await supabase
          .from('user_brand_permissions')
          .update({ user_id: data.user.id })
          .eq('user_id', null)
          .eq('email', data.user.email);
        
        setSuccess(true);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success ? (
            <Alert className="mb-4">
              <AlertDescription>
                Account confirmed successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleConfirmation}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Your job title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                
                <Button type="submit" disabled={loading || !token}>
                  {loading ? 'Processing...' : 'Complete Registration'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Having trouble? Contact your administrator for assistance.
        </CardFooter>
      </Card>
    </div>
  );
}
```

## 4. Email Template Customization Steps

To customize the invitation email template:

1. Login to the Supabase Dashboard
2. Navigate to Authentication → Email Templates
3. Select the "Invite" template
4. Update the template with MixerAI branding:

```html
<!-- Example customized template -->
<h2>You've been invited to join MixerAI</h2>
<p>
  You've been invited to join the MixerAI platform. Click the button below to accept the invitation and create your account.
</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
    Accept Invitation
  </a>
</p>
<p>
  Or copy and paste this URL into your browser:
  <br>
  {{ .ConfirmationURL }}
</p>
<p>
  This invitation will expire in 24 hours.
</p>
```

## 5. Clean Up Unnecessary Complexity

### Remove Feature Flags

Remove the feature flags that add unnecessary complexity to the invitation system:

1. Delete or disable the following flags in `src/lib/feature-flags.ts`:
   - `INVITE_RETRY_LOGIC`
   - `INVITE_ENHANCED_LOGGING`
   - `INVITE_DRY_RUN`
   - `INVITE_DIRECT_SQL`

```typescript
// src/lib/feature-flags.ts
// Remove these flags or set them all to false

export const FEATURE_FLAGS = {
  // Remove or comment out these flags
  // INVITE_RETRY_LOGIC: getFeatureFlagValue('INVITE_RETRY_LOGIC', false),
  // INVITE_ENHANCED_LOGGING: getFeatureFlagValue('INVITE_ENHANCED_LOGGING', false),
  // INVITE_DRY_RUN: getFeatureFlagValue('INVITE_DRY_RUN', false),
  // INVITE_DIRECT_SQL: getFeatureFlagValue('INVITE_DIRECT_SQL', false),
  
  // Keep other feature flags that are unrelated to invitation
};
```

### Remove Unnecessary Files

Consider removing or archiving these files if they're no longer needed:

- `src/lib/invitation-with-retry.ts` - Replace with simpler, direct approach
- `src/lib/auth/direct-invitation.ts` - No longer needed with simplified approach
- `scripts/check-invitation-flags.js` - Not needed after removing feature flags

## Implementation Steps

1. **Database Setup**:
   - Create the `invitation_logs` table to track invitation attempts
   - Verify that the profile creation trigger is working correctly

2. **API Update**:
   - Update the `/api/users/invite` route with the simplified code
   - Remove unnecessary complexity and feature flag checks

3. **Confirmation Page**:
   - Update the auth confirmation page to handle invitations smoothly
   - Implement the profile update functionality

4. **Email Template**:
   - Update the invitation email template in the Supabase dashboard
   - Make sure the confirmation URL is properly configured

5. **Cleanup**:
   - Remove the feature flags related to invitation
   - Remove or archive unnecessary files and code

## Testing Plan

1. **Basic Invitation Flow**:
   - Test inviting a new user as an administrator
   - Verify the invitation email is sent correctly
   - Confirm the user can complete registration

2. **Error Scenarios**:
   - Test permission checks by attempting to invite as a non-admin
   - Verify duplicate user checks prevent re-inviting existing users

3. **Brand Assignment**:
   - Test inviting a user with brand assignment
   - Verify the brand permissions are correctly assigned after registration

## Conclusion

This simplified approach focuses on the core functionality of the invitation system while removing unnecessary complexity. By streamlining the code and focusing on reliability, the system will be easier to maintain and troubleshoot when issues arise. 