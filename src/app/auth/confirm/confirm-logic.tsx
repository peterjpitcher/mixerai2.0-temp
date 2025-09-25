'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Spinner } from '@/components/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logger';
import { createSupabaseClient } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api-client-csrf';

export function ConfirmLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setErrorMessage('This confirmation link is missing the security code. Ask your administrator to send a new invite.');
      return;
    }

    const supabase = createSupabaseClient();
    let cancelled = false;

    const exchangeCode = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) {
          return;
        }
        if (error) {
          logError('[auth/confirm] Supabase code exchange failed', {
            status: error.status,
            message: error.message,
            name: error.name,
          });

          const normalised = error.message?.toLowerCase() ?? '';
          let friendlyMessage = 'We could not verify this invitation. It may have already been used or is no longer valid. Please request a fresh invite.';

          if (normalised.includes('expired') || normalised.includes('invalid grant')) {
            friendlyMessage = 'This invitation link has expired or was already used. Ask your administrator to send a new invite.';
          } else if (error.status === 400) {
            friendlyMessage = 'This invite link is invalid. Double-check that you copied the entire URL or request a new invitation.';
          }

          setStatus('error');
          setErrorMessage(friendlyMessage);
          return;
        }

        try {
          const response = await apiClient.post('/api/auth/complete-invite');
          const payload = await response.json().catch(() => ({ success: false, message: 'Unable to complete invite.' }));

          if (!response.ok || !payload?.success) {
            const message = payload?.message || 'We could not finalise your invite. Please try again or contact your administrator.';
            setStatus('error');
            setErrorMessage(message);
            return;
          }
        } catch (inviteError) {
          if (cancelled) {
            return;
          }
          logError('[auth/confirm] Failed to complete invite', inviteError);
          setStatus('error');
          setErrorMessage('Your invite was confirmed, but we could not finish account setup. Please try signing in again or contact support.');
          return;
        }

        router.replace('/auth/update-password');
      } catch (err) {
        if (cancelled) {
          return;
        }
        logError('[auth/confirm] Unexpected error during code exchange', err);
        const message = err instanceof Error ? err.message : String(err);
        setStatus('error');
        setErrorMessage(
          `We hit an unexpected issue while confirming your invite (${message}). Please try again, or contact support if it persists.`
        );
      }
    };

    exchangeCode();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      {status === 'loading' && (
        <>
          <div className="flex items-center space-x-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-xl text-foreground">Finalising security checks...</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Please wait, we&apos;re confirming your request. Do not close this window.</p>
        </>
      )}

      {status === 'error' && (
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertTitle>We couldn&apos;t confirm your invite</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button asChild variant="secondary">
              <Link href="/auth/login">Return to login</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
