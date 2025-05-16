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
  ChevronDown,
  ChevronRight,
  Wrench,
  Code,
  Image,
  Globe,
  Folder,
  ListChecks,
  Loader2,
  MessageSquareWarning,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string;
    full_name?: string;
    // other metadata fields
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; // role within that brand
    // other permission fields
  }>;
  // Add other fields that your session endpoint might return
}

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
  
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true,
    tools: true,
    feedback: false
  });

  // State for user templates
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Flag to track if templates have been fetched already
  const templatesFetched = useRef(false);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me'); 
        if (!response.ok) {
          throw new Error('Failed to fetch user session');
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('[UnifiedNavigation] Error fetching current user:', error);
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

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
          console.error('[UnifiedNavigation] Failed to fetch templates:', data.error);
        }
      } catch (error) {
        console.error('[UnifiedNavigation] Error fetching templates:', error);
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
    if ((pathname.includes('/feedback') || pathname.includes('/admin/feedback-log')) && !expandedSections.feedback) {
      newExpandedState.feedback = true;
      changed = true;
    }
    if (changed) {
      setExpandedSections(newExpandedState);
    }
  }, [pathname]);

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
  
  // Define permission helper functions based on currentUser
  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];
  const hasBrandAdminPermission = userBrandPermissions.some(bp => bp.role === 'admin');

  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isPlatformAdmin = userRole === 'admin' && userBrandPermissions.length === 0;
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;

  // Primary nav items - base structure
  let navItemsDefinition: (NavItem | NavGroupItem)[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: '' // Dashboard is active when segments are empty
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
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      items: contentItems, 
      segment: 'content-new', 
      defaultOpen: true
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
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <Folder className="h-5 w-5" />,
      segment: 'templates'
    },
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
          label: 'Content Transcreator',
          icon: <Globe className="h-4 w-4" />,
          segment: 'content-transcreator'
        }
      ]
    },
    // Users link - will be filtered by role later
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users'
    }
  ];

  // Filter nav items based on user role
  let filteredNavItems = [...navItemsDefinition]; // Start with a copy

  if (isLoadingUser) {
    filteredNavItems = []; // Show nothing or a loader while user is loading
  } else if (isViewer || isEditor) { // For Viewer and Editor roles
    filteredNavItems = navItemsDefinition.filter(item => 
      item.label !== 'Users' && 
      item.label !== 'Content Templates' &&
      // Ensure "Content" group (for creation) is not shown if it has no items (e.g. no templates for user)
      !((item as NavGroupItem).label === 'Content' && (item as NavGroupItem).items.length === 0)
    );
  } else if (isScopedAdmin) { 
    // Scoped Admins see most things, user management is global.
    // No specific top-level items removed by default for scoped admin, 
    // specific access control is at page/API level.
    filteredNavItems = navItemsDefinition.filter(item => 
      !((item as NavGroupItem).label === 'Content' && (item as NavGroupItem).items.length === 0)
    );
  } else if (isPlatformAdmin) {
    // Platform Admins see all items defined in navItemsDefinition
    filteredNavItems = navItemsDefinition.filter(item => 
      !((item as NavGroupItem).label === 'Content' && (item as NavGroupItem).items.length === 0)
    );
  } else if (!currentUser) {
    // Not logged in or user data failed to load - show minimal or no nav
    filteredNavItems = navItemsDefinition.filter(item => 
      item.label === 'Dashboard' // Example: only allow dashboard, or empty array
    ); 
    // Or filteredNavItems = [];
  }

  // Bottom nav items (settings, help) - always visible for logged-in users
  // Ensure these are defined correctly here
  const bottomNavItems: NavItem[] = currentUser && !isLoadingUser ? [
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
  ] : [];
  
  // Check if a navigation item is active based on the current URL path and segments
  const isActive = (item: NavItem | NavGroupItem) => {
    // For simple nav items
    if ('href' in item) {
      // Exact match for dashboard root
      if (item.href === '/dashboard' && segments.length === 0 && pathname === '/dashboard') {
        return true;
      }
      // Check if the current path starts with the item's href, for non-root items
      // and ensure it's not just a partial match for a longer path unless it's a group segment
      if (item.segment && segments[0] === item.segment) {
         // If item.segment is 'content', active if segments[0] is 'content'
         // and potentially segments[1] for sub-routes like /content/[id] or /content/new
        if(item.segment === 'content' && segments[0] === 'content'){
            return true;
        }
        // For items like /dashboard/users, /dashboard/brands, it's a direct segment match
        if (segments.length === 1 && segments[0] === item.segment) {
            return true;
        }
         // For /dashboard/templates specifically
        if (item.segment === 'templates' && segments[0] === 'templates') {
            return true;
        }
        return false; // Fallback for basic segment check
      }
      return pathname.startsWith(item.href) && item.href !== '/dashboard';
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
  
  // Dynamically build navigation items based on roles and permissions
  const finalNavItems: (NavItem | NavGroupItem | { type: 'divider' })[] = [];

  // Always visible for authenticated users
  finalNavItems.push({
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    segment: '' 
  });
  finalNavItems.push({
    href: '/dashboard/my-tasks',
    label: 'My Tasks',
    icon: <ListChecks className="h-5 w-5" />,
    segment: 'my-tasks'
  });

  // Brands: Visible if Platform Admin, Global Admin, or user has any brand permission
  if (isPlatformAdmin || isAdmin || userBrandPermissions.length > 0) {
    finalNavItems.push({
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands'
    });
  }
  
  // Content Templates: Visible if Platform Admin, Global Admin, or Global Editor
  if (isPlatformAdmin || isAdmin || isEditor) {
    finalNavItems.push({
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <Folder className="h-5 w-5" />, 
      segment: 'templates'
    });
  }
  
  // Workflows: Visible if Platform Admin, Global Admin, OR (Global Editor AND Brand Admin for at least one brand)
  if (isPlatformAdmin || isAdmin || (isEditor && hasBrandAdminPermission)) {
    finalNavItems.push({
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows'
    });
  }

  // Content (All Content page): Visible to all authenticated users who might have content access
  // (API will filter actual content)
  if (isPlatformAdmin || isAdmin || isEditor || isViewer) {
     finalNavItems.push({
      href: '/dashboard/content',
      label: 'Content', // This is the link to the main content listing page
      icon: <FileText className="h-5 w-5" />, 
      segment: 'content'
    });
  }
  
  // "Create Content" NavGroupItem (the folder for templates)
  // Visible if Platform Admin, Global Admin, or Global Editor (similar to who can manage templates or see tools)
  if (isPlatformAdmin || isAdmin || isEditor) {
    if (contentItems.length > 0) { // Only show if there are templates
      finalNavItems.push({
        label: 'Create Content', // New, distinct label
        icon: <BookOpen className="h-5 w-5" />, // Original icon for this group
        items: contentItems,
        segment: 'content-new', // Keep original segment or choose a new one
        defaultOpen: expandedSections.content !== undefined ? expandedSections.content : true
      });
    }
  }
  
  // Tools: Visible if Platform Admin, Global Admin, or Global Editor
  if (isPlatformAdmin || isAdmin || isEditor) {
    const toolItems: NavItem[] = [
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
        label: 'Content Transcreator',
        icon: <Globe className="h-4 w-4" />,
        segment: 'content-transcreator'
      },
    ];
    // Only add the Tools group if there are items to show (though these are static for now)
    if (toolItems.length > 0) {
        finalNavItems.push({
            label: 'Tools',
            icon: <Wrench className="h-5 w-5" />,
            items: toolItems,
            segment: 'tools',
            defaultOpen: expandedSections.tools !== undefined ? expandedSections.tools : true
        });
    }
  }

  // Feedback Links - Placed before User Management and Account/Help for visibility
  if (currentUser && !isLoadingUser) {
    // View Feedback for all authenticated users
    finalNavItems.push({
        href: '/dashboard/feedback',
        label: 'View Feedback',
        icon: <Info className="h-5 w-5" />,
        segment: 'feedback'
    });

    // Submit Feedback for all authenticated users
    // The "isAdmin" check is removed, label is changed
    finalNavItems.push({
        href: '/dashboard/admin/feedback-log',
        label: 'Submit Feedback',
        icon: <MessageSquareWarning className="h-5 w-5" />,
        segment: 'admin-feedback-log' // Unique segment
    });
  }

  // Separator
  finalNavItems.push({ type: 'divider' });

  // Users: Visible if Platform Admin or Global Admin
  if (isPlatformAdmin || isAdmin) {
    finalNavItems.push({
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users'
    });
  }
  
  // Account & Help: Always visible for authenticated users
  finalNavItems.push({
    href: '/dashboard/account',
    label: 'Account',
    icon: <Settings className="h-5 w-5" />,
    segment: 'account'
  });
  finalNavItems.push({
    href: '/dashboard/help',
    label: 'Help',
    icon: <HelpCircle className="h-5 w-5" />,
    segment: 'help'
  });

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-card w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
        <div className="space-y-8">
          <div className="space-y-1">
            {finalNavItems.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                return <hr key={index} className="my-2 border-t border-border" />;
              }
              if ('items' in item) {
                return (
                  <div key={index} className="space-y-1">
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
                );
              }
              if ('href' in item) {
                return (
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
                );
              }
              return null;
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default UnifiedNavigation; 