"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { apiFetchJson } from '@/lib/api-client';
import type { AccountLockStatus } from '@/lib/auth/account-lockout';
import { sessionConfig } from '@/lib/auth/session-config';
import { useSearchParams } from 'next/navigation';

/**
 * LoginForm component.
 * Provides a form for users to log in using their email and password.
 * Handles form submission, communicates with Supabase for authentication,
 * and displays loading states, errors, and success notifications.
 */
export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const resetStatus = searchParams.get('reset');
    const errorCode = searchParams.get('error');
    let shouldCleanup = false;

    if (resetStatus === 'success') {
      toast.success('Password updated. Please sign in with your new password.');
      shouldCleanup = true;
    }

    if (errorCode) {
      switch (errorCode) {
        case 'reset_missing_token':
          toast.error('This password reset link was missing its security code. Please request a new email.');
          shouldCleanup = true;
          break;
        case 'reset_missing_state':
        case 'reset_session':
          toast.error('Your password reset session has expired. Please request a fresh link.');
          shouldCleanup = true;
          break;
        case 'reset_expired':
          toast.error('This password reset link has expired. Request a new one to continue.');
          shouldCleanup = true;
          break;
        case 'reset_invalid':
          toast.error('We could not verify that password reset link. Please request a new reset email.');
          shouldCleanup = true;
          break;
        case 'invite_completion_failed':
          toast.error('Invite confirmed, but we could not finish account setup. Please sign in and try again or contact support.');
          shouldCleanup = true;
          break;
        case 'callback':
          toast.error('We could not complete the sign-in flow. Please try again.');
          shouldCleanup = true;
          break;
        default:
          break;
      }
    }

    if (shouldCleanup) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('reset');
      cleanUrl.searchParams.delete('error');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [searchParams]);

  const fetchLockoutStatus = async (payload: { email: string; action: 'status' | 'record'; success?: boolean }): Promise<AccountLockStatus> => {
    try {
      const response = await apiFetchJson<{ success: boolean; status: AccountLockStatus }>(
        '/api/auth/login-lockout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          errorMessage: 'Failed to evaluate account lockout state',
        }
      );

      return response.status;
    } catch (error) {
      console.warn('[login] Unable to evaluate lockout status', error);
      return {
        locked: false,
        attempts: 0,
        remainingAttempts: sessionConfig.lockout.maxAttempts,
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const lockStatus = await fetchLockoutStatus({ email, action: 'status' });
      if (lockStatus.locked) {
        const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60);
        setError(`Account temporarily locked due to too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setIsLoading(false);
        return;
      }

      const supabase = createSupabaseClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Clear password field for security
        setPassword("");
        
        // Record failed attempt
        const newLockStatus = await fetchLockoutStatus({ email, action: 'record', success: false });
        if (newLockStatus.locked) {
          const minutes = Math.ceil((newLockStatus.remainingTime || 0) / 60);
          setError(`Account has been locked due to too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        } else {
          const remainingAttempts = newLockStatus.remainingAttempts ?? Math.max(0, sessionConfig.lockout.maxAttempts - (newLockStatus.attempts || 0));
          // Use consistent error message wording
          const errorMessage = signInError.message === "Invalid login credentials" 
            ? "Invalid email or password" 
            : signInError.message;
          setError(`${errorMessage}${remainingAttempts < 3 ? ` (${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining)` : ''}`);
        }
        
        // Only show toast for actual login attempts, not for session validation errors
        if (email && password) {
          toast.error(signInError.message === "Invalid login credentials" ? "Invalid email or password" : signInError.message);
        }
      } else {
        // Record successful attempt
        fetchLockoutStatus({ email, action: 'record', success: true }).catch(error => {
          console.warn('[login] Failed to clear lockout state after successful login', error);
        });
        
        toast.success('You have been logged in successfully.');
        
        // Add a small delay to ensure auth state is properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use window.location for a hard redirect to ensure cookies are properly set
        window.location.href = "/dashboard";
      }
    } catch (err) {
      // Clear password field for security
      setPassword("");
      setError("An unexpected error occurred. Please try again.");
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Log in to your account</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              type="email" 
              autoCapitalize="none" 
              autoComplete="email" 
              autoCorrect="off"
              disabled={isLoading} 
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline" tabIndex={-1}>
                Forgot password?
              </Link>
            </div>
            <Input 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password" 
              autoComplete="current-password"
              disabled={isLoading}
              required
              tabIndex={0}
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-center w-full text-sm">
          Access to MixerAI is by invitation only.
        </div>
      </CardFooter>
    </Card>
  );
} 
