'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from '@/components/ui/button';
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { User, LayoutDashboard, Tags, Users2, GitFork, FileText, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { SkipLink } from '@/components/ui/skip-link';

/**
 * RootLayoutWrapper component.
 * Provides a general layout for public-facing or non-dashboard authenticated pages 
 * (e.g., /release-notes, potentially /account if it doesn't use DashboardLayout).
 * This layout is skipped for paths starting with /auth, /api, or /dashboard.
 */
export default function RootLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname() || '';

  // Skip layout for specific paths
  const skipLayoutPaths = [
    '/auth',
    '/api',
    '/dashboard', // Skip layout for dashboard routes which have their own layout
  ];

  // Check if the current path should skip the dashboard layout
  const shouldSkipLayout = skipLayoutPaths.some(path => pathname.startsWith(path));

  if (shouldSkipLayout) {
    return <>{children}</>;
  }

  const isActive = (path: string) => {
    // Handle root path exact match, otherwise startsWith for sections
    if (path === "/") return pathname === path;
    return pathname.startsWith(path);
  };

  // Simplified navigation items for this generic layout. 
  // Links point to dashboard versions as top-level paths should redirect there.
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/dashboard/brands", label: "Brands", icon: <Tags /> }, // Changed icon
    { href: "/dashboard/users", label: "Users", icon: <Users2 /> }, // Changed icon
    { href: "/dashboard/workflows", label: "Workflows", icon: <GitFork /> }, // Changed icon
    { href: "/dashboard/content", label: "Content", icon: <FileText /> }, // Changed icon
  ];

  const bottomNavLinks = [
    { href: "/dashboard/account", label: "Account Settings", icon: <Settings /> },
    { href: "/dashboard/help", label: "Help & Support", icon: <HelpCircle /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      {/* Header: Updated to use primary theme color */}
      <header className="border-b bg-primary text-primary-foreground sticky top-0 z-40 shadow-sm" role="banner">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div 
                className="w-9 h-9 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-bold text-lg shadow-sm"
              >
                M
              </div>
              <h1 className="text-xl font-semibold">MixerAI</h1> {/* Simplified title */}
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationCenter /> 
            {/* Mock Sign Out / Account buttons for non-dashboard layout - actual logic in DashboardLayout */}
            <Button variant="ghost" asChild className="text-primary-foreground hover:bg-white/20">
              <Link href="/dashboard/account" aria-label="Account">
                 <User className="h-5 w-5" /> 
                 <span className="hidden sm:inline ml-1.5">Account</span>
              </Link>
            </Button>
            {/* Log out button might not be relevant here if this layout is for unauthenticated pages or if auth is handled elsewhere */}
            {/* <Button variant="ghost" className="text-primary-foreground hover:bg-white/20" aria-label="Log out">
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline ml-1.5">Log out</span>
            </Button> */}
          </div>
        </div>
      </header>

      <div className="flex flex-1 container mx-auto">
        {/* Sidebar: Simplified or potentially removed if this layout is very generic */}
        {/* For now, keeping a simplified version, links point to dashboard routes */}
        <nav role="navigation" aria-label="Main navigation" className="w-56 border-r bg-card p-4 space-y-2 hidden md:block shrink-0 h-[calc(100vh-var(--header-height,61px))] sticky top-[var(--header-height,61px)] overflow-y-auto">
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider px-2">Menu</span>
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={cn(
                "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors",
                isActive(link.href) 
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
            >
              {link.icon && React.cloneElement(link.icon as React.ReactElement, { className: "h-5 w-5" })}
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-border">
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider px-2">Support</span>
            {bottomNavLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={cn(
                  "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors mt-1",
                  isActive(link.href) 
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                )}
              >
                {link.icon && React.cloneElement(link.icon as React.ReactElement, { className: "h-5 w-5" })}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Mobile navigation not implemented for this generic wrapper, focus on dashboard nav */}

        <main id="main-content" role="main" className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      
      <footer role="contentinfo" className="border-t py-4 bg-muted/40 text-center">
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MixerAI. All rights reserved.
            <Link href="/privacy-policy" className="ml-2 hover:text-primary hover:underline">Privacy Policy</Link>
            <span className="mx-1">|</span>
            <Link href="/terms" className="ml-1 hover:text-primary hover:underline">Terms of Service</Link>
            <span className="mx-1">|</span>
            <Link href="/release-notes" className="ml-1 hover:text-primary hover:underline">Release Notes</Link>
          </p>
        </div>
      </footer>
    </div>
  );
} 