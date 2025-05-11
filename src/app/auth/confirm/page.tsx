'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/card';
import { Label } from '@/components/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Spinner } from '@/components/spinner';
import type { Metadata } from 'next';
import { CheckCheck, Bell } from 'lucide-react';

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
  const token = searchParams?.get('token') || '';
  const type = searchParams?.get('type') || 'invite';
  const redirectTo = searchParams?.get('redirect_to') || '/dashboard';
  
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
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
    if (!token) {
      setError('Missing confirmation token. Please check your invitation link or confirmation email.');
      return;
    }

    const getInvitationInfo = async () => {
      try {
        const { data: userDataResponse, error: userError } = await supabase.auth.getUser();
        
        if (userError && userError.message !== "User not found" && userError.message !== "Invalid token: token contains an invalid number of segments") { 
          // Only throw if not common "User not found" or specific token parsing issues before verification
          throw userError;
        }
        if (userDataResponse?.user?.email) {
          setEmail(userDataResponse.user.email);
          if (userDataResponse.user.user_metadata?.full_name) {
            setFullName(userDataResponse.user.user_metadata.full_name);
          }
          if (userDataResponse.user.user_metadata?.job_title) {
            setJobTitle(userDataResponse.user.user_metadata.job_title);
          }
          if (userDataResponse.user.user_metadata?.company) {
            setCompany(userDataResponse.user.user_metadata.company);
          } else if (userDataResponse.user.email) {
            setCompany(extractCompanyFromEmail(userDataResponse.user.email));
          }
        }
      } catch (err: any) {
        setError(err.message || 'Could not retrieve invitation details. The link may be invalid or expired.');
      }
    };

    if (type === 'invite') {
        getInvitationInfo();
    }
  }, [token, type, supabase.auth]);
  
  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (type === 'invite') {
        if (!password) throw new Error('Please set a password to complete your registration.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!jobTitle.trim()) throw new Error('Job title is required.');
        if (!company.trim()) throw new Error('Company name is required.');
        
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        });
        if (verifyError) throw verifyError;
        
        if (verifyData?.user) {
          const { error: updateUserError } = await supabase.auth.updateUser({
            password: password,
            data: {
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
              company: company.trim()
            }
          });
          if (updateUserError) throw updateUserError;
          
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: verifyData.user.id,
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
              company: company.trim(),
              email: verifyData.user.email,
              updated_at: new Date().toISOString()
            });
          if (profileError) throw profileError;
          
          // Server-side logic should ideally handle further operations like:
          // - Updating user_brand_permissions based on invite details
          // - Updating workflow_invitations status to 'accepted'
          // - Updating assignees in workflow.steps JSONB (complex, best server-side)
          // A dedicated API call could be made here to trigger those server-side actions.

        } else {
            throw new Error("User details could not be confirmed with the provided token.");
        }
      } else {
        const { error: confirmError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });
        if (confirmError) throw confirmError;
      }
      
      setSuccess(true);
      setTimeout(() => {
        try {
          const redirectUrlObj = new URL(redirectTo, window.location.origin);
          window.location.href = redirectUrlObj.toString();
        } catch (e) {
          router.push(redirectTo.startsWith('/') ? redirectTo : '/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm your account. Please check the link or try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {type === 'invite' ? 'Accept Invitation & Set Up Account' : 'Confirm Your Account'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Confirmation Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-success/10 p-3 text-success">
                    <CheckCheck className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{type === 'invite' && fullName ? `Welcome, ${fullName}!` : 'Account Confirmed!'}</h3>
                <p className="mt-2 text-muted-foreground">
                  Your account has been confirmed successfully.
                </p>
                <p className="mt-1 text-muted-foreground">
                  You will be redirected shortly...
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmation} className="space-y-6">
                {type === 'invite' && (
                  <>
                    {email && (
                      <Alert variant="default" className="mb-6 bg-secondary/10 border-secondary/30 text-secondary">
                        <Bell className="h-4 w-4" />
                        <AlertTitle className="text-secondary-foreground">Invitation for {email}</AlertTitle>
                        <AlertDescription className="text-secondary-foreground/80">
                          Please complete your account set up below.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        aria-required="true"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="jobTitle">Job Title <span className="text-destructive">*</span></Label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Marketing Manager"
                        required
                        aria-required="true"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="company">Company <span className="text-destructive">*</span></Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Your company name"
                        required
                        aria-required="true"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Set Password <span className="text-destructive">*</span></Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        aria-required="true"
                        minLength={6}
                      />
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading || !token}>
                  {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {type === 'invite' ? 'Complete Account Setup' : 'Confirm Account'}
                </Button>
              </form>
            )}
          </CardContent>
          
          { !success && type !== 'invite' && (
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