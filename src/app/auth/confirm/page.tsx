'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/card';
import { Label } from '@/components/label';
import { Alert } from '@/components/alert';
import { Spinner } from '@/components/spinner';

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
  
  // Extract company name from email domain
  const extractCompanyFromEmail = (email: string) => {
    try {
      const domain = email.split('@')[1];
      if (!domain) return '';
      
      // Remove common TLDs and extract the main domain name
      const mainDomain = domain.split('.')[0];
      
      // Capitalize the first letter of each word
      return mainDomain
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (error) {
      console.error('Error extracting company from email:', error);
      return '';
    }
  };
  
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
          
          // Pre-fill company from metadata if available, or extract from email
          if (data.user.user_metadata?.company) {
            setCompany(data.user.user_metadata.company);
          } else if (data.user.email) {
            setCompany(extractCompanyFromEmail(data.user.email));
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
      console.log('Form data:', { fullName, jobTitle, company, passwordLength: password.length });
      
      if (type === 'invite' && !password) {
        throw new Error('Please set a password to complete your registration');
      }
      
      if (type === 'invite' && !fullName.trim()) {
        throw new Error('Full name is required');
      }
      
      if (type === 'invite' && !jobTitle.trim()) {
        throw new Error('Job title is required');
      }
      
      if (type === 'invite' && !company.trim()) {
        throw new Error('Company is required');
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
              job_title: jobTitle.trim(),
              company: company.trim()
            }
          });
          
          if (updateUserError) throw updateUserError;
          
          // Update the user's profile with additional information without job_description
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
              company: company.trim(),
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
          
          // Update workflow invitations status to accepted and link to user ID
          if (data?.user?.email) {
            const userEmail = data.user.email;
            const userId = data.user.id;
            
            const { error: workflowInviteError } = await supabase
              .from('workflow_invitations')
              .update({ status: 'accepted' })
              .eq('email', userEmail)
              .eq('status', 'pending');
            
            if (workflowInviteError) {
              console.error('Error updating workflow invitations:', workflowInviteError);
            } else {
              console.log('Workflow invitations updated successfully');
            }
            
            // Update the assignees in workflow steps to include proper name instead of just email
            try {
              // Get all workflows that have this user's email in steps
              const { data: workflows, error: workflowsError } = await supabase
                .from('workflows')
                .select('id, steps');
              
              if (workflowsError) {
                console.error('Error fetching workflows:', workflowsError);
              } else if (workflows) {
                // For each workflow, check if any steps have assignees with this email
                for (const workflow of workflows) {
                  if (workflow.steps && Array.isArray(workflow.steps)) {
                    let updated = false;
                    const updatedSteps = workflow.steps.map((step: any) => {
                      if (step.assignees && Array.isArray(step.assignees)) {
                        step.assignees = step.assignees.map((assignee: any) => {
                          if (assignee.email === userEmail) {
                            updated = true;
                            return {
                              ...assignee,
                              id: userId,
                              name: fullName.trim()
                            };
                          }
                          return assignee;
                        });
                      }
                      return step;
                    });
                    
                    // If any steps were updated, save the workflow
                    if (updated) {
                      const { error: updateError } = await supabase
                        .from('workflows')
                        .update({ steps: updatedSteps })
                        .eq('id', workflow.id);
                      
                      if (updateError) {
                        console.error(`Error updating workflow ${workflow.id}:`, updateError);
                      } else {
                        console.log(`Updated workflow ${workflow.id} with user's name`);
                      }
                    }
                  }
                }
              }
            } catch (workflowUpdateError) {
              console.error('Error updating workflow assignees:', workflowUpdateError);
            }
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
                      <Label htmlFor="company">Company <span className="text-red-500">*</span></Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Your company"
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

// Main component with suspense boundary
export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <ConfirmContent />
    </Suspense>
  );
} 