'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/card';
import { Label } from '@/components/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Spinner } from '@/components/spinner';
import type { Metadata } from 'next';
import { CheckCheck, Bell, KeyRound } from 'lucide-react';

// It's good practice to define metadata for pages, though this is a client component.
// If this page had a server component wrapper, metadata export would go there.
// export const metadata: Metadata = {
//   title: 'Confirm Account | MixerAI 2.0',
//   description: 'Confirm your MixerAI account registration or invitation.',
// };

/**
 * Main content for the account confirmation page.
 * Handles token verification, password setting for invites, and user profile updates.
 */
function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States for invite/signup flow (from query params)
  const [inviteToken, setInviteToken] = useState('');
  const [flowType, setFlowType] = useState('invite'); // Default or from query param

  // States for password recovery flow (from hash)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Common states
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  
  const supabase = createSupabaseClient();
  
  const extractCompanyFromEmail = (emailAddress: string) => {
    if (!emailAddress) return '';
    try {
      const domain = emailAddress.split('@')[1];
      if (!domain) return '';
      const mainDomain = domain.split('.')[0];
      return mainDomain
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (e) {
      return ''; // Error in extraction, return empty
    }
  };
  
  useEffect(() => {
    let determinedFlowType = 'unknown';
    let errorFromHash: string | null = null;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const typeFromHash = params.get('type');
      const hashError = params.get('error_description');

      if (hashError) {
        errorFromHash = decodeURIComponent(hashError);
        determinedFlowType = 'error';
      } else if (typeFromHash === 'recovery') {
        determinedFlowType = 'recovery';
      }
    }

    if (errorFromHash) {
      setError(errorFromHash);
      setIsRecoveryFlow(false);
      setFlowType('error'); // Indicate an error state
      setLoading(false);
      setInitialMessage(null);
      return;
    }

    if (determinedFlowType === 'recovery') {
      setIsRecoveryFlow(true);
      setFlowType('recovery');
      setInitialMessage('Please set your new password.');
      setLoading(false);
      return; 
    }

    // Fallback to query params for non-recovery flows (invite, signup)
    const queryToken = searchParams?.get('token') || '';
    const queryType = searchParams?.get('type') || 'invite'; // Default to invite if no type query param
    
    setInviteToken(queryToken);
    setFlowType(queryType);
    setInitialMessage(queryType === 'invite' ? 'Loading invitation details...' : 'Verifying...');

    if (!queryToken) {
      setError('Missing confirmation token. Please check your link.');
      setLoading(false);
      setInitialMessage(null);
      return;
    }

    const getInvitationInfo = async () => {
      setLoading(true); // Set loading true for async operation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
          setFullName(user.user_metadata?.full_name || '');
          setJobTitle(user.user_metadata?.job_title || '');
          setCompany(user.user_metadata?.company || extractCompanyFromEmail(user.email));
        }
        setInitialMessage(queryType === 'invite' ? 'Please complete your account details.' : null);
      } catch (err: any) {
        setInitialMessage('Could not load invitation details. Please complete the form.');
        setError('Failed to retrieve initial details. You can still proceed.'); // Non-blocking error
      } finally {
        setLoading(false);
      }
    };

    if (queryType === 'invite') {
      getInvitationInfo();
    } else { // For signup or other query-param based flows
      setLoading(false);
      setInitialMessage(null);
    }
  }, [searchParams]); // useEffect will run when searchParams are available
  
  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const redirectTo = searchParams?.get('redirect_to') || '/dashboard';

    try {
      if (isRecoveryFlow) {
        if (!newPassword) throw new Error('Please enter a new password.');
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (newPassword !== confirmNewPassword) throw new Error('Passwords do not match.');

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        // For recovery, also update profile's updated_at if user is available
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        }

      } else if (flowType === 'invite') {
        if (!password) throw new Error('Please set a password to complete your registration.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!jobTitle.trim()) throw new Error('Job title is required.');
        if (!company.trim()) throw new Error('Company name is required.');
        
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: inviteToken, // Use token from query for invite
          type: 'invite',
        });
        if (verifyError) throw verifyError;
        
        if (verifyData?.user) {
          const { error: updateUserError } = await supabase.auth.updateUser({
            password: password,
            data: { full_name: fullName.trim(), job_title: jobTitle.trim(), company: company.trim() }
          });
          if (updateUserError) throw updateUserError;
          
          await supabase.from('profiles').upsert({
            id: verifyData.user.id, full_name: fullName.trim(), job_title: jobTitle.trim(), 
            company: company.trim(), email: verifyData.user.email, updated_at: new Date().toISOString()
          });
          
          const completeInviteResponse = await fetch('/api/auth/complete-invite', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
          });
          if (!completeInviteResponse.ok) {
            const completeErrorData = await completeInviteResponse.json().catch(() => ({ error: 'Failed to parse complete-invite response' }));
            throw new Error(completeErrorData.error || 'Failed to finalize account setup.');
          }
        } else {
            throw new Error("User details could not be confirmed for invite.");
        }
      } else { // For other types like 'signup' that use query token
        const { error: confirmError } = await supabase.auth.verifyOtp({
          token_hash: inviteToken, // Use token from query for these types
          type: flowType as any,
        });
        if (confirmError) throw confirmError;
      }
      
      setSuccess(true);
      setTimeout(() => {
        try {
          const redirectUrlObj = new URL(redirectTo, window.location.origin);
          window.location.href = redirectUrlObj.toString(); // Full page redirect to clear auth state changes
        } catch (e) {
          router.push(redirectTo.startsWith('/') ? redirectTo : '/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  let cardTitle = 'Confirm Your Account';
  if (isRecoveryFlow) cardTitle = 'Set New Password';
  else if (flowType === 'invite') cardTitle = 'Accept Invitation & Set Up Account';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link href="/" aria-label="Go to homepage">
            <Image 
              src="/Mixerai2.0Logo.png" 
              alt="MixerAI 2.0 Logo"
              width={250} 
              height={58} 
              priority 
            />
          </Link>
        </div>
        <Card className="shadow-lg w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center">{cardTitle}</CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-green-500/10 p-3 text-green-600">
                    <CheckCheck className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">
                  {isRecoveryFlow ? 'Password Updated Successfully!' : (flowType === 'invite' && fullName ? `Welcome, ${fullName}!` : 'Account Confirmed!')}
                </h3>
                <p className="mt-2 text-muted-foreground">Your request has been processed. You will be redirected shortly...</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmation} className="space-y-6">
                {initialMessage && (
                    <Alert variant="default" className="mb-6">
                        <Bell className="h-4 w-4" />
                        <AlertTitle>{isRecoveryFlow ? 'Password Reset' : (flowType === 'invite' ? `Invitation for ${email || 'you'}`: 'Account Confirmation')}</AlertTitle>
                        <AlertDescription>{initialMessage}</AlertDescription>
                    </Alert>
                )}

                {isRecoveryFlow && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New Password <span className="text-destructive">*</span></Label>
                      <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmNewPassword">Confirm New Password <span className="text-destructive">*</span></Label>
                      <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Re-enter your new password" required minLength={6} />
                    </div>
                  </>
                )}

                {flowType === 'invite' && (
                  <>
                    {/* Initial message for invite is handled by the generic initialMessage Alert above if email is not yet known */}
                    {email && !initialMessage && (
                      <Alert variant="default" className="mb-6 bg-secondary/10 border-secondary/30 text-secondary">
                        <Bell className="h-4 w-4" />
                        <AlertTitle className="text-secondary-foreground">Invitation for {email}</AlertTitle>
                        <AlertDescription className="text-secondary-foreground/80">Please complete your account details.</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="jobTitle">Job Title <span className="text-destructive">*</span></Label>
                      <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Marketing Manager" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company">Company <span className="text-destructive">*</span></Label>
                      <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Set Password <span className="text-destructive">*</span></Label>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading || (!isRecoveryFlow && flowType !== 'signup' && !inviteToken) }>
                  {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {isRecoveryFlow ? 'Set New Password' : (flowType === 'invite' ? 'Complete Account Setup' : 'Confirm Account')}
                </Button>
              </form>
            )}
          </CardContent>
          
          { !success && !isRecoveryFlow && flowType !== 'invite' && (
            <CardFooter className="pt-4">
              <div className="text-center w-full text-sm text-muted-foreground">
                {'Already confirmed?'}{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Log in here
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * ConfirmPage wraps ConfirmContent with Suspense for client-side data fetching.
 * It serves as the entry point for account confirmation links.
 */
export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-center"><Spinner size="lg" /><p className="text-muted-foreground ml-2">Loading confirmation...</p></div>}>
      <ConfirmContent />
    </Suspense>
  );
} 