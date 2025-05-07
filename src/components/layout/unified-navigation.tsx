'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';
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
  Store,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  segment?: string; // Used for active state calculation with segments
}

interface NavGroupItem {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  segment?: string; // For matching the parent segment
  defaultOpen?: boolean; // Whether the group should be expanded by default
}

/**
 * Unified navigation component for MixerAI dashboard
 * Uses Next.js useSelectedLayoutSegments() for accurate active state tracking
 */
export function UnifiedNavigation() {
  const pathname = usePathname() || '';
  const layoutSegments = useSelectedLayoutSegments();
  // Ensure segments is always an array to fix linter errors
  const segments = layoutSegments || [];
  
  // Track expanded state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true // Content section expanded by default
  });

  // Automatically expand sections based on current path
  useEffect(() => {
    const newExpandedState = { ...expandedSections };
    
    if (pathname.includes('/content') && !expandedSections.content) {
      newExpandedState.content = true;
    }
    
    setExpandedSections(newExpandedState);
  }, [pathname]);

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };
  
  // Primary nav items
  const navItems: (NavItem | NavGroupItem)[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: ''
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows'
    },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands'
    },
    // Content with submenu
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      segment: 'content',
      defaultOpen: true,
      items: [
        {
          href: '/dashboard/content/article',
          label: 'Articles',
          icon: <FileText className="h-4 w-4" />,
          segment: 'article'
        },
        {
          href: '/dashboard/content/ownedpdp',
          label: 'Owned PDP',
          icon: <ShoppingBag className="h-4 w-4" />,
          segment: 'ownedpdp'
        },
        {
          href: '/dashboard/content/retailerpdp',
          label: 'Retailer PDP',
          icon: <Store className="h-4 w-4" />,
          segment: 'retailerpdp'
        }
      ]
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users'
    }
  ];
  
  // Bottom nav items (settings, help)
  const bottomNavItems: NavItem[] = [
    {
      href: '/dashboard/account',
      label: 'Account',
      icon: <Settings className="h-5 w-5" />,
      segment: 'account'
    },
    {
      href: '/dashboard/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help'
    }
  ];
  
  // Check if a navigation item is active based on the current URL path and segments
  const isActive = (item: NavItem | NavGroupItem) => {
    // For simple nav items
    if ('href' in item) {
      // Exact match for dashboard root
      if (item.href === '/dashboard' && segments.length === 0) {
        return true;
      }
      
      // For other items, check if the segment matches
      if (item.segment && segments.includes(item.segment)) {
        return true;
      }
      
      return false;
    }
    
    // For group items, check if any child item is active
    if ('items' in item) {
      return item.items.some(subItem => 
        segments.includes(subItem.segment || '') || 
        pathname === subItem.href
      );
    }
    
    return false;
  };
  
  return (
    <nav className="bg-side-nav w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
      <div className="space-y-8">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            'items' in item ? (
              // Group with submenu
              <div key={index} className="space-y-1">
                {/* Group header - clickable to expand/collapse */}
                <button 
                  onClick={() => toggleSection(item.label.toLowerCase())}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item)
                      ? "text-primary bg-primary-50"
                      : "text-neutral-700 hover:text-primary hover:bg-primary-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {expandedSections[item.label.toLowerCase()] 
                    ? <ChevronDown className="h-4 w-4" /> 
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {/* Group items - indented, only show if expanded */}
                {expandedSections[item.label.toLowerCase()] && (
                  <div className="pl-6 space-y-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                          (segments.includes(subItem.segment || '') || pathname === subItem.href)
                            ? 'bg-primary text-white'
                            : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                        )}
                      >
                        {subItem.icon}
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single nav item
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(item)
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
        
        {/* Bottom navigation items */}
        <div className="pt-4 border-t border-border">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1',
                segments.includes(item.segment || '')
                  ? 'bg-primary text-white'
                  : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default UnifiedNavigation; 