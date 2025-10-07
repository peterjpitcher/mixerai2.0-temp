'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/spinner';
import { CheckCheck, AlertTriangle } from 'lucide-react';

import { createSupabaseClient } from '@/lib/supabase/client';
import { validatePassword, passwordPolicy } from '@/lib/auth/session-config';
import { apiFetch } from '@/lib/api-client';

type Status = 'ready' | 'submitting' | 'success' | 'error';

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [status, setStatus] = useState<Status>('ready');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setValidationErrors([]);
      setStatus('error');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setErrorMsg('Please address the password requirements below.');
      setStatus('error');
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

      try {
        await apiFetch('/api/auth/clear-lockout', { method: 'POST' });
      } catch (lockoutError) {
        console.warn('[update-password] Failed to clear login attempts after password reset', lockoutError);
      }

      setStatus('success');
    } catch (error) {
      setErrorMsg((error as Error).message);
      setValidationErrors([]);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-500/10 p-3 text-green-600">
            <CheckCheck className="h-8 w-8" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Password Updated!</h3>
        <p className="mt-2 text-muted-foreground">You can now sign in with your new password.</p>
        <Button onClick={() => router.replace('/auth/login?reset=success')} className="mt-4">
          Go to Login
        </Button>
        <p className="mt-6 text-xs text-muted-foreground leading-5">
          If you requested a password email, keep in mind it can take up to five minutes to arrive. Still nothing after fifteen minutes? Message Peter Pitcher on Teams and we&apos;ll help you finish up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handlePasswordUpdate} className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        A secure session has been established. Please set your new password.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
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
          onChange={(event) => setConfirmPassword(event.target.value)}
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
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {status === 'error' && errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? (
          <span className="flex items-center justify-center space-x-2">
            <Spinner className="h-4 w-4" />
            <span>Updating password...</span>
          </span>
        ) : (
          'Set New Password'
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center leading-5">
        Emails can take up to five minutes to arrive. If nothing shows up after fifteen minutes, message Peter Pitcher on Teams and we&apos;ll make sure the reset goes through.
      </p>
    </form>
  );
}
