import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | MixerAI 2.0',
  description: 'Log in to your MixerAI account to access the dashboard.',
};

/**
 * LoginPage component.
 * Displays the login page, including the MixerAI logo and the LoginForm component.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">M</div>
            <span className="text-2xl font-bold">MixerAI 2.0</span>
          </Link>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
} 