'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/spinner';
import { CheckCheck, AlertTriangle } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { validatePassword, passwordPolicy } from '@/lib/auth/session-config';

function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [status, setStatus] = useState<'ready' | 'submitting' | 'complete' | 'error'>('ready');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setErrorMsg('Please address the password requirements below.');
      setStatus('ready');
      return;
    }
    
    setValidationErrors([]);
    
    setErrorMsg(null);
    setStatus('submitting');
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw new Error(error.message || 'Failed to update password.');
      }
      
      setValidationErrors([]);
      setStatus('complete');
    } catch (error) {
      setErrorMsg((error as Error).message);
      setValidationErrors([]);
      setStatus('error');
    }
  };

  // UI Rendering Logic based on status
  const renderContent = () => {
    switch (status) {
      case 'error': return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{errorMsg}</AlertDescription></Alert>;
      case 'submitting': return <div className="flex justify-center items-center py-8"><Spinner className="h-6 w-6" /><p className="ml-2 text-muted-foreground">Updating password...</p></div>;
      case 'complete': return <div className="text-center py-8"><div className="mb-4 flex justify-center"><div className="rounded-full bg-green-500/10 p-3 text-green-600"><CheckCheck className="h-8 w-8" /></div></div><h3 className="text-xl font-semibold">Password Updated!</h3><p className="mt-2 text-muted-foreground">You may now log in with your new password.</p><Button onClick={() => router.push('/auth/login')} className="mt-4">Go to Login</Button></div>;
      case 'ready': return (
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">A secure session has been established. Please set your new password.</p>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`At least ${passwordPolicy.minLength} characters with upper, lower, number & special`}
                required
                minLength={passwordPolicy.minLength}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={passwordPolicy.minLength}
                autoComplete="new-password"
              />
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Your password must include:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>At least {passwordPolicy.minLength} characters</li>
                <li>One uppercase and one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character ({passwordPolicy.specialChars})</li>
              </ul>
            </div>
            {validationErrors.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Password requirements not met:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            <Button type="submit" className="w-full">Set New Password</Button>
          </form>
        );
    }
  };

  return <CardContent className="pt-6">{renderContent()}</CardContent>;
}


export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center"><Link href="/" aria-label="Go to homepage"><Image src="/Mixerai2.0Logo.png" alt="MixerAI 2.0 Logo" width={250} height={58} priority /></Link></div>
        <Card className="shadow-lg w-full">
          <CardHeader><CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle></CardHeader>
          <Suspense fallback={<div className="flex justify-center items-center py-8"><Spinner className="h-6 w-6" /></div>}>
            <UpdatePasswordForm />
          </Suspense>
          <CardFooter className="pt-4"><div className="text-center w-full text-sm"><Link href="/auth/login" className="font-medium text-primary-foreground/80 hover:text-primary-foreground hover:underline">Back to Login</Link></div></CardFooter>
        </Card>
      </div>
    </div>
  );
} 
