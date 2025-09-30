'use client';

import Link from "next/link";
import { Button } from '@/components/ui/button';
// import { NotificationCenter } from "@/components/dashboard/notification-center";
import { UnifiedNavigationV2 } from "@/components/layout/unified-navigation-v2";
import { BottomMobileNavigation } from "@/components/layout/BottomMobileNavigation";
import { usePathname, useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";
import { LogOut, UserCircle2, Loader2 } from "lucide-react";
import React, { Suspense } from "react";
import Image from 'next/image';
import { DevelopmentOnly } from "@/components/development-only";
import { ErrorBoundary } from "@/components/error-boundary";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { IssueReporter } from '@/components/issue-reporter';
import { useAuth } from '@/contexts/auth-context';

// Define UserSessionData interface (can be shared if defined elsewhere)
/**
 * DashboardLayout component.
 * Provides the main layout structure for all authenticated dashboard pages.
 * Includes a header with navigation and user actions, and a sidebar navigation.
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser, isLoading: isLoadingUser, signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      sonnerToast.success('You have been successfully signed out.');
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      sonnerToast.warning('There was an issue during logout, but you have been redirected to the login page.');
      router.push('/auth/login');
      router.refresh();
      return;
    } finally {
      // signOut already navigates to the login page via window.location.
    }
  };

  const displayName = currentUser?.user_metadata?.full_name || currentUser?.full_name || 'User';
  const avatarUrl = currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url;

  return (
    <SessionTimeoutProvider warningMinutes={25} sessionMinutes={30}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b bg-secondary text-secondary-foreground sticky top-0 z-40 h-16">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between h-full">
          <div className="flex items-center gap-2 font-semibold">
            <Image 
              src="/Mixerai2.0Logo.png" 
              alt="MixerAI 2.0 Logo"
              width={225}
              height={52}
              priority
              style={{ height: 'auto' }}
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              size="sm"
              asChild
              className="hidden sm:flex bg-yellow-400 text-neutral-800 hover:bg-yellow-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400 dark:bg-yellow-500 dark:text-neutral-900 dark:hover:bg-yellow-600 dark:focus-visible:ring-yellow-500"
            >
              <Link href="https://teams.microsoft.com/l/chat/0/0?users=peter.pitcher@genmills.com" target="_blank" rel="noopener noreferrer">
                Get Help
              </Link>
            </Button>

            {isLoadingUser ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : currentUser ? (
              <>
                <div className="flex items-center space-x-2">
                  {avatarUrl ? (
                    <Image 
                      src={avatarUrl} 
                      alt={displayName} 
                      width={32} 
                      height={32} 
                      className="rounded-full" 
                    />
                  ) : (
                    <UserCircle2 className="h-8 w-8" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">
                    {displayName}
                  </span>
                </div>
              </>
            ) : null}
            <Button 
              variant="ghost" 
              className="text-secondary-foreground hover:bg-black/10"
              onClick={handleSignOut}
              aria-label="Log out"
              disabled={isLoadingUser}
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <Suspense fallback={<div className="w-64 p-4 border-r"><Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" /></div>}>
          <UnifiedNavigationV2 className="w-64 border-r bg-muted/40 hidden sm:flex flex-col" />
        </Suspense>
        <main key={pathname} className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-auto lg:pb-6 pb-20">
          <DevelopmentOnly>
            <div id="domain-verification-container" className="mb-4">
              {/* This will be populated client-side */}
            </div>
          </DevelopmentOnly>
          <ErrorBoundary key={`${pathname}-boundary`}>
            <Suspense
              key={`${pathname}-suspense`}
              fallback={(
                <div className="flex h-full min-h-[320px] w-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <BottomMobileNavigation />
      <IssueReporter />
    </div>
    </SessionTimeoutProvider>
  );
} 
