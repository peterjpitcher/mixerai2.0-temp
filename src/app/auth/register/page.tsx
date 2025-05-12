'use client';

import { useState } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Checkbox } from "@/components/checkbox";
import { useToast } from "@/components/use-toast";
import { createSupabaseClient } from '@/lib/supabase/client';
import type { Metadata } from 'next';

/**
 * RegisterPage component.
 * Displays the registration form for users to create a new MixerAI account.
 * Note: This page itself does not contain the form logic, it likely uses a RegisterForm component.
 * The current provided file content seems to be a LoginForm, not a RegisterForm.
 * Assuming a RegisterForm component similar to LoginForm would be used here.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms and conditions.");
      toast({ title: "Error", description: "You must accept the terms and conditions.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            // You can add other metadata here if needed
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        toast({ title: "Registration failed", description: signUpError.message, variant: "destructive" });
      } else if (data.user?.identities?.length === 0) {
        // This case might indicate the user already exists but is not confirmed (social auth linking issue, less common with email)
        setError("This email may already be registered. Please try logging in or use a different email.");
        toast({ title: "Registration notice", description: "This email may already be registered.", variant: "default" });
      } else if (data.session) {
        // User is signed up and logged in (e.g. if auto-confirm is on and secure email disabled)
        toast({ title: "Success!", description: "Account created and you are logged in." });
        router.push('/dashboard');
        router.refresh();
      } else {
        // Standard case: user signed up, needs to confirm email
        toast({ title: "Registration successful!", description: "Please check your email to confirm your account." });
        // Optionally redirect to a page saying "check your email"
        // router.push('/auth/check-email'); 
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">M</div>
            <span className="text-2xl font-bold">MixerAI 2.0</span>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
            <CardDescription className="text-center">
              Enter your details below to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input 
                    id="first-name" 
                    placeholder="John" 
                    required 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input 
                    id="last-name" 
                    placeholder="Doe" 
                    required 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  required 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))} 
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I agree to the{" "}
                  <Link href="/terms" className="underline" target="_blank">Terms of Service</Link> and{" "}
                  <Link href="/privacy-policy" className="underline" target="_blank">Privacy Policy</Link>.
                </Label>
              </div>
              
              {error && (
                <p className="text-sm text-destructive text-center pt-2">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-center w-full text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 