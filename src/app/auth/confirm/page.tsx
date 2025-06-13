'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/spinner';

function ConfirmLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (!searchParams) {
        // This case should be handled by the Suspense boundary but adding for type safety
        return;
    }
    const code = searchParams.get('code');
    // const next = searchParams.get('next') ?? '/';

    if (code) {
      const supabase = createSupabaseClient();
      const exchangeCode = async () => {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Supabase code exchange failed:', error);
            // Redirect to a dedicated error page or login with an error message
            router.replace(`/auth/login?error=true&message=${encodeURIComponent(error.message)}`);
          } else {
            // On successful exchange, Supabase client now has the session.
            // Redirect to the update password page.
            router.replace('/auth/update-password');
          }
        } catch (err) {
            console.error('An unexpected error occurred during code exchange:', err);
            const error = err as Error;
            router.replace(`/auth/login?error=true&message=${encodeURIComponent("An unexpected error occurred: " + error.message)}`);
        }
      };
      exchangeCode();
    } else {
        // If there's no code, maybe the user landed here by mistake.
        router.replace('/auth/login?error=true&message=Invalid confirmation link.');
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-4">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xl text-foreground">Finalising security checks...</p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Please wait, we&apos;re confirming your request. Do not close this window.</p>
    </div>
  );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ConfirmLogic />
        </Suspense>
    )
} 