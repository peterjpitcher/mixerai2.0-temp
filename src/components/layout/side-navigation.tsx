'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  GitBranch,
  BookOpen,
  Building2,
  Users,
  Settings,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Side navigation component that uses the light blue shade
 */
export function SideNavigation() {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />
    },
    {
      href: '/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />
    },
    {
      href: '/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />
    },
    {
      href: '/content',
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />
    },
    {
      href: '/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />
    }
  ];
  
  const bottomNavItems: NavItem[] = [
    {
      href: '/settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />
    },
    {
      href: '/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />
    }
  ];
  
  return (
    <nav className="bg-side-nav w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
      <div className="space-y-8">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname?.startsWith(item.href)
                  ? 'bg-primary text-white'
                  : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1',
                pathname?.startsWith(item.href)
                  ? 'bg-primary text-white'
                  : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <div className="p-3 bg-white rounded-md border border-border">
            <p className="text-xs text-neutral-600 mb-2">
              Need help creating content?
            </p>
            <Link
              href="/workflows/templates"
              className="flex items-center justify-center bg-primary text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-600 transition-colors"
            >
              View Templates
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default SideNavigation; 