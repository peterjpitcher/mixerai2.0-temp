'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Spinner } from '@/components/spinner';
import { Mail, CheckCircle, AlertTriangle } from 'lucide-react';

// Initialize the Supabase client outside the component to ensure it's a stable singleton instance.
// This is critical for the PKCE flow's state to be preserved in sessionStorage.
const supabase = createSupabaseClient();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // This is the correct flow. It MUST point to the page that handles the hash fragment.
    const resetPasswordRedirectUrl = `${window.location.origin}/auth/confirm`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordRedirectUrl,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMessage('If an account exists for this email, a password reset link has been sent.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
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

        <div className="bg-card p-8 shadow-xl rounded-lg text-card-foreground">
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
            Forgot Your Password?
          </h2>

          {successMessage && (
            <Alert variant="default" className="mb-4 border-green-500 bg-green-50 text-green-700">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-600">Email Sent</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="sr-only">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full"
                />
              </div>

              <div>
                <Button type="submit" className="w-full group relative" disabled={loading}>
                  {loading && <Spinner className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                  <span className={loading ? 'opacity-0' : 'opacity-100'}>Send Reset Link</span>
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/auth/login" className="font-medium text-primary-foreground hover:text-primary-foreground/80 hover:underline">
              Remembered your password? Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 