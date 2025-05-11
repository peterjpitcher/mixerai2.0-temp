'use client';

import Link from "next/link";
import { Button } from "@/components/button";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { UnifiedNavigation } from "@/components/layout/unified-navigation";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useToast } from "@/components/use-toast";
import { LogOut } from "lucide-react";

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
  const { toast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      router.push('/auth/login');
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error Signing Out",
        description: error?.message || "There was a problem signing out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-secondary text-secondary-foreground sticky top-0 z-40">
        <div className="w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div 
                className="w-10 h-10 rounded-full bg-secondary-foreground text-secondary flex items-center justify-center font-bold text-xl shadow-sm"
              >
                M
              </div>
              <h1 className="text-2xl font-bold">MixerAI 2.0</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <NotificationCenter />
            <Button 
              variant="ghost" 
              className="text-secondary-foreground hover:bg-black/10"
              onClick={handleSignOut}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <UnifiedNavigation />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {process.env.NODE_ENV === 'development' && (
            <div id="domain-verification-container" className="mb-4">
              {/* This will be populated client-side */}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
} 