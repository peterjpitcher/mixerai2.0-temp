'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { cn } from '@/lib/utils';

/**
 * Top navigation component that uses the primary blue color
 */
export function TopNavigation() {
  const pathname = usePathname();
  
  return (
    <header className="bg-top-nav text-white h-16 flex items-center px-6 sticky top-0 z-50 shadow-md">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button variant="ghost" className="lg:hidden p-0 text-white hover:bg-primary-dark">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
          
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-xl">MixerAI</span>
          </Link>
          
          {/* Main navigation links (desktop only) */}
          <nav className="hidden lg:flex items-center gap-6 ml-6">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/workflows', label: 'Workflows' },
              { href: '/brands', label: 'Brands' },
              { href: '/content', label: 'Content' },
              { href: '/users', label: 'Users' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-white/80',
                  pathname?.startsWith(href) 
                    ? 'text-white' 
                    : 'text-white/70'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" className="p-2 text-white hover:bg-primary-dark rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          {/* User avatar */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatar-placeholder.png" alt="User" />
              <AvatarFallback>
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden md:inline-block">User Name</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNavigation; 