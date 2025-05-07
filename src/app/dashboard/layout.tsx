'use client';

import Link from "next/link";
import { Button } from "@/components/button";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { SideNavigationV2 } from "@/components/layout/side-navigation-v2";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#13599f' }}>
        <div className="max-w-[1440px] mx-auto px-4 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#13599f] font-bold text-xl">M</div>
              <h1 className="text-2xl font-bold">MixerAI 2.0</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button variant="ghost" asChild className="text-white hover:bg-[#13599f]/80">
              <Link href="/account">
                <span className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Account</span>
                </span>
              </Link>
            </Button>
            <Button variant="ghost" className="text-white hover:bg-[#13599f]/80">
              <span className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log out</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Use the new SideNavigationV2 component */}
        <SideNavigationV2 />

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Dynamic import for DomainVerification to avoid build errors */}
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