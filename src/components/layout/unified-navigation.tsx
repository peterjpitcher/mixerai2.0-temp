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
  ChevronRight,
  Wrench,
  Code,
  Image,
  Globe,
  MoreVertical,
  Folder,
  ListChecks
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

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
 * Unified navigation component for MixerAI dashboard.
 * Provides sidebar navigation with collapsible sections and dynamic content template links.
 * Uses Next.js useSelectedLayoutSegments() for accurate active state tracking.
 */
export function UnifiedNavigation() {
  const pathname = usePathname() || '';
  const layoutSegments = useSelectedLayoutSegments();
  const segments = layoutSegments || [];
  
  // Track expanded state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true, // Content section expanded by default
    tools: true    // Tools section expanded by default
  });

  // State for user templates
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Flag to track if templates have been fetched already
  const templatesFetched = useRef(false);

  // Fetch templates from the API only once when the component mounts or content section is expanded
  useEffect(() => {
    const fetchTemplates = async () => {
      if (templatesFetched.current || isLoadingTemplates) return;
      setIsLoadingTemplates(true);
      templatesFetched.current = true;
      try {
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        
        if (data.success && data.templates) {
          setUserTemplates(data.templates);
        } else {
          // Consider adding a toast notification for failure here
        }
      } catch (error) {
        // Consider adding a toast notification for failure here
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    // Always fetch templates when the component mounts
    fetchTemplates();
  }, [isLoadingTemplates]);

  // Automatically expand sections based on current path
  useEffect(() => {
    const newExpandedState = { ...expandedSections };
    let changed = false;
    if (pathname.includes('/content') && !expandedSections.content) {
      newExpandedState.content = true;
      changed = true;
    }
    if (pathname.includes('/tools') && !expandedSections.tools) {
      newExpandedState.tools = true;
      changed = true;
    }
    if (pathname.includes('/templates') && !expandedSections.content) {
      newExpandedState.content = true;
      changed = true;
    }
    if (changed) {
      setExpandedSections(newExpandedState);
    }
  }, [pathname]); // Removed expandedSections from dependency array as it causes re-runs

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Content items - use templates from database
  const contentItems = userTemplates.map(template => ({
    href: `/dashboard/content/new?template=${template.id}`,
    label: template.name,
    icon: <FileText className="h-4 w-4" />,
    segment: template.id
  }));
  
  // Primary nav items
  const navItems: (NavItem | NavGroupItem)[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: ''
    },
    {
      href: '/dashboard/my-tasks',
      label: 'My Tasks',
      icon: <ListChecks className="h-5 w-5" />,
      segment: 'my-tasks'
    },
    {
      href: '/dashboard/content',
      label: 'All Content',
      icon: <Folder className="h-5 w-5" />,
      segment: 'content'
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
    // Content Templates as a separate top-level item
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <Folder className="h-5 w-5" />,
      segment: 'templates'
    },
    // Content with submenu for creating new content using templates from database
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      items: [...contentItems],
      segment: 'content-new',
      defaultOpen: true
    },
    // New Tools section with submenu
    {
      label: 'Tools',
      icon: <Wrench className="h-5 w-5" />,
      segment: 'tools',
      defaultOpen: true,
      items: [
        {
          href: '/dashboard/tools/metadata-generator',
          label: 'Metadata Generator',
          icon: <Code className="h-4 w-4" />,
          segment: 'metadata-generator'
        },
        {
          href: '/dashboard/tools/alt-text-generator',
          label: 'Alt Text Generator',
          icon: <Image className="h-4 w-4" />,
          segment: 'alt-text-generator'
        },
        {
          href: '/dashboard/tools/content-transcreator',
          label: 'Content Trans-Creator',
          icon: <Globe className="h-4 w-4" />,
          segment: 'content-transcreator'
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
    <nav className="bg-card w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
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
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-primary"
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
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-primary"
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
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
                (segments.includes(item.segment || '') || pathname === item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
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