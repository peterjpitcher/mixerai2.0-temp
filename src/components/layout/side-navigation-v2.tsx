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
  HelpCircle,
  FileText,
  ShoppingBag,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroupItem {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

/**
 * Side navigation component that uses the light blue shade
 * V2: Added content type submenu items
 */
export function SideNavigationV2() {
  const pathname = usePathname();
  
  // Regular nav items without submenus
  const navItems: (NavItem | NavGroupItem)[] = [
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
    // Content with submenu - always visible
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      items: [
        {
          href: '/dashboard/content/article',
          label: 'Articles',
          icon: <FileText className="h-4 w-4" />
        },
        {
          href: '/dashboard/content/ownedpdp',
          label: 'Owned PDP',
          icon: <ShoppingBag className="h-4 w-4" />
        },
        {
          href: '/dashboard/content/retailerpdp',
          label: 'Retailer PDP',
          icon: <Store className="h-4 w-4" />
        }
      ]
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
          {navItems.map((item, index) => (
            'items' in item ? (
              <div key={index} className="space-y-1">
                {/* Group header */}
                <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700">
                  {item.icon}
                  {item.label}
                </div>
                
                {/* Group items - indented */}
                <div className="pl-6 space-y-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                        pathname?.startsWith(subItem.href)
                          ? 'bg-primary text-white'
                          : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                      )}
                    >
                      {subItem.icon}
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
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
            )
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

export default SideNavigationV2; 