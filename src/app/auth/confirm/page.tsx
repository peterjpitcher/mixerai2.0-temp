'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/card';
import { Label } from '@/components/label';
import { Alert } from '@/components/alert';
import { Spinner } from '@/components/spinner';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const type = searchParams?.get('type') || 'invite';
  const redirectTo = searchParams?.get('redirect_to') || '/dashboard';
  
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  useEffect(() => {
    // Verify the token is present
    if (!token) {
      setError('Missing confirmation token. Please check your invitation link.');
      return;
    }

    // Try to extract information about the invitation
    const getInvitationInfo = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        console.log('Auth user data:', data);
        if (error) {
          console.error('Error getting user information:', error);
        } else if (data?.user?.email) {
          setEmail(data.user.email);
          
          // Pre-fill name from metadata if available
          if (data.user.user_metadata?.full_name) {
            setFullName(data.user.user_metadata.full_name);
          }
          
          // Pre-fill job title from metadata if available
          if (data.user.user_metadata?.job_title) {
            setJobTitle(data.user.user_metadata.job_title);
          }
        }
      } catch (err) {
        console.error('Error getting invitation details:', err);
      }
    };

    getInvitationInfo();
  }, [token, supabase.auth]);
  
  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Debug logging
      console.log('Confirming invitation with token:', token);
      console.log('Form data:', { fullName, jobTitle, passwordLength: password.length });
      
      if (type === 'invite' && !password) {
        throw new Error('Please set a password to complete your registration');
      }
      
      if (type === 'invite' && !fullName.trim()) {
        throw new Error('Full name is required');
      }
      
      if (type === 'invite' && !jobTitle.trim()) {
        throw new Error('Job title is required');
      }
      
      // For invited users, they need to set a password
      if (type === 'invite') {
        // First verify the token without setting password
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        });
        
        if (verifyError) throw verifyError;
        
        // Then update the password separately
        if (data?.user) {
          // Update user metadata first
          const { error: updateUserError } = await supabase.auth.updateUser({
            password: password,
            data: {
              full_name: fullName.trim(),
              job_title: jobTitle.trim()
            }
          });
          
          if (updateUserError) throw updateUserError;
          
          // Update the user's profile with additional information
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error('Error updating profile:', profileError);
            throw profileError;
          } else {
            console.log('Profile updated successfully');
          }
          
          // Update any pending brand assignments
          const { error: permissionError } = await supabase
            .from('user_brand_permissions')
            .update({ user_id: data.user.id })
            .is('user_id', null)
            .eq('email', data.user.email);
          
          if (permissionError) {
            console.error('Error updating permissions:', permissionError);
          }
        }
      } else {
        // For regular signups (not invites)
        const { error: confirmError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });
        
        if (confirmError) throw confirmError;
      }
      
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        // Use the redirect_to parameter if provided, otherwise go to dashboard
        try {
          const redirectUrl = new URL(redirectTo);
          window.location.href = redirectUrl.toString();
        } catch (e) {
          // If the URL is invalid or relative, use router
          router.push(redirectTo);
        }
      }, 1500);
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {type === 'invite' ? 'Accept Invitation' : 'Confirm Account'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <svg 
                      className="h-6 w-6 text-green-600" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Welcome, {fullName}!</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Your account has been confirmed successfully.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  You'll be redirected to the dashboard in a moment...
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmation} className="space-y-4">
                {type === 'invite' && (
                  <>
                    {email && (
                      <div className="bg-blue-50 p-4 rounded-md mb-4">
                        <p className="text-sm text-blue-800">
                          You're confirming an invitation for <strong>{email}</strong>
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="jobTitle">Job Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Your job title"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="password">Set Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a secure password"
                        required
                      />
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Spinner className="mr-2" />
                  ) : null}
                  {type === 'invite' ? 'Complete Registration' : 'Confirm Account'}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter>
            <div className="text-center w-full text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/auth/login" className="font-medium text-primary hover:underline">
                Log in
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 