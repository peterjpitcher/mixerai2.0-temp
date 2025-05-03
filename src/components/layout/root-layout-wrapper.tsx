'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/button";
import { NotificationCenter } from "@/components/dashboard/notification-center";

export default function RootLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

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
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">M</div>
              <h1 className="text-2xl font-bold">MixerAI 2.0</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button variant="ghost" asChild>
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
            <Button variant="ghost">
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
        {/* Sidebar */}
        <aside className="w-64 border-r hidden md:block">
          <nav className="p-4 space-y-2">
            <Link 
              href="/" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/brands" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/brands') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7V2h5" />
                <path d="M16 2h5v5" />
                <path d="M22 16v5h-5" />
                <path d="M7 22H2v-5" />
                <path d="M22 2 2 22" />
              </svg>
              <span>Brands</span>
            </Link>
            <Link 
              href="/users" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/users') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Users</span>
            </Link>
            <Link 
              href="/workflows" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/workflows') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="8" x="2" y="2" rx="2" />
                <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
                <polyline points="7 21 10 18 7 15" />
                <rect width="8" height="8" x="14" y="14" rx="2" />
              </svg>
              <span>Workflows</span>
            </Link>
            <Link 
              href="/content" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/content') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
              <span>Content</span>
            </Link>
            <Link 
              href="/todo-app" 
              className={`flex items-center space-x-2 p-2 rounded-md ${isActive('/todo-app') ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="15" x2="13" y2="15" />
              </svg>
              <span>Todo App</span>
            </Link>
          </nav>
        </aside>

        {/* Mobile navigation (hidden on medium screens and above) */}
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
          <div className="grid h-full grid-cols-5">
            <Link href="/" className={`flex flex-col items-center justify-center ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
              <span className="text-xs">Dashboard</span>
            </Link>
            <Link href="/brands" className={`flex flex-col items-center justify-center ${isActive('/brands') ? 'text-primary' : 'text-muted-foreground'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7V2h5" />
                <path d="M16 2h5v5" />
                <path d="M22 16v5h-5" />
                <path d="M7 22H2v-5" />
                <path d="M22 2 2 22" />
              </svg>
              <span className="text-xs">Brands</span>
            </Link>
            <Link href="/content" className={`flex flex-col items-center justify-center ${isActive('/content') ? 'text-primary' : 'text-muted-foreground'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
              <span className="text-xs">Content</span>
            </Link>
            <Link href="/workflows" className={`flex flex-col items-center justify-center ${isActive('/workflows') ? 'text-primary' : 'text-muted-foreground'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="8" x="2" y="2" rx="2" />
                <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
                <polyline points="7 21 10 18 7 15" />
                <rect width="8" height="8" x="14" y="14" rx="2" />
              </svg>
              <span className="text-xs">Workflows</span>
            </Link>
            <Link href="/account" className={`flex flex-col items-center justify-center ${isActive('/account') ? 'text-primary' : 'text-muted-foreground'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-xs">Account</span>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-6 p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 