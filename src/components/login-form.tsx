"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from 'sonner';
import { isAccountLocked, recordLoginAttempt } from '@/lib/auth/account-lockout';
import { AlertCircle } from 'lucide-react';

/**
 * LoginForm component.
 * Provides a form for users to log in using their email and password.
 * Handles form submission, communicates with Supabase for authentication,
 * and displays loading states, errors, and success notifications.
 */
export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Check if account is locked
      const lockStatus = await isAccountLocked(email);
      if (lockStatus.locked) {
        const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60);
        setError(`Account temporarily locked due to too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setIsLoading(false);
        return;
      }

      const supabase = createSupabaseClient();
      
      // Get IP address (in production, this would come from request headers)
      const ip = 'unknown'; // TODO: Get real IP from headers
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Record failed attempt
        await recordLoginAttempt(email, ip, false);
        
        // Check if this attempt triggered a lockout
        const newLockStatus = await isAccountLocked(email);
        if (newLockStatus.locked) {
          const minutes = Math.ceil((newLockStatus.remainingTime || 0) / 60);
          setError(`Account has been locked due to too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        } else {
          const remainingAttempts = 5 - (newLockStatus.attempts || 0);
          setError(`${signInError.message}${remainingAttempts < 3 ? ` (${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining)` : ''}`);
        }
        
        toast.error(signInError.message);
      } else {
        // Record successful attempt
        await recordLoginAttempt(email, ip, true);
        
        toast.success('You have been logged in successfully.');
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
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
              <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
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