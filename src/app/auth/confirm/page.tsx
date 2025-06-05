'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/card';
import { Label } from '@/components/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Spinner } from '@/components/spinner';
import { CheckCheck, AlertTriangle } from 'lucide-react';

// Initialize the Supabase client outside the component to ensure it's a stable singleton instance.
const supabase = createSupabaseClient();

function PasswordRecoveryFlow() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'complete' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  useEffect(() => {
    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !handled) {
        handled = true;
        setStatus('ready');
      }
    });

    const timer = setTimeout(() => {
      if (!handled) {
        // Fallback: Manually check hash if event doesn't fire
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');

        if (accessToken) {
          console.warn('onAuthStateChange event did not fire, attempting manual session set.');
          supabase.auth.setSession({ 
            access_token: accessToken, 
            refresh_token: params.get('refresh_token') || '' 
          }).then(({ error }) => {
            if (error) {
              setErrorMsg('Link appears valid, but failed to establish a session. Please try again.');
              setStatus('error');
            } else {
              handled = true;
              setStatus('ready');
            }
          });
        } else {
          // If no access token in hash, the link is truly invalid/expired
          setErrorMsg('The password recovery link is invalid, has expired, or the session could not be established. Please try requesting a new link.');
          setStatus('error');
        }
      }
    }, 2000); // Shortened timeout to 2 seconds for quicker fallback

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []); // Empty dependency array to run once

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg(null);
    setStatus('submitting');
    
    // The session is already set by onAuthStateChange, so we can directly update the user.
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setErrorMsg(updateError.message);
      setStatus('error');
    } else {
      setStatus('complete');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <div className="flex justify-center items-center py-8"><Spinner className="h-6 w-6" /><p className="ml-2 text-muted-foreground">Verifying link...</p></div>;

      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        );

      case 'submitting':
        return <div className="flex justify-center items-center py-8"><Spinner className="h-6 w-6" /><p className="ml-2 text-muted-foreground">Updating password...</p></div>;
      
      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3 text-green-600"><CheckCheck className="h-8 w-8" /></div>
            </div>
            <h3 className="text-xl font-semibold">Password Updated!</h3>
            <p className="mt-2 text-muted-foreground">Your password has been successfully updated.</p>
            <Button onClick={() => router.push('/auth/login')} className="mt-4">Go to Login</Button>
          </div>
        );

      case 'ready':
        return (
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required minLength={6} />
            </div>
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            <Button type="submit" className="w-full">Set New Password</Button>
          </form>
        );
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link href="/" aria-label="Go to homepage">
            <Image src="/Mixerai2.0Logo.png" alt="MixerAI 2.0 Logo" width={250} height={58} priority />
          </Link>
        </div>
        <Card className="shadow-lg w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderContent()}
          </CardContent>
          {status === 'error' && (
            <CardFooter className="pt-4">
                <div className="text-center w-full text-sm">
                  <Link href="/auth/login" className="font-medium text-primary-foreground/80 hover:text-primary-foreground hover:underline">
                    Back to Login
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

// This page is now specialized for password recovery.
// Invite/Signup flows would need to be handled by a different page if they use query tokens.
export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-center"><Spinner size="lg" /><p className="text-muted-foreground ml-2">Loading...</p></div>}>
      <PasswordRecoveryFlow />
    </Suspense>
  );
} 