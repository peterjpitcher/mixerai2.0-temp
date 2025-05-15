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
  ListChecks,
  Loader2
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
  console.log('[UnifiedNavigation] Component rendering - Initial currentUser state from useState:', currentUser);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
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

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      console.log('[UnifiedNavigation] fetchCurrentUser - Starting to fetch');
      try {
        const response = await fetch('/api/me'); 
        if (!response.ok) {
          throw new Error('Failed to fetch user session');
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          console.log('[UnifiedNavigation] fetchCurrentUser - setCurrentUser CALLED with:', data.user);
        } else {
          setCurrentUser(null);
          console.error('[UnifiedNavigation] Failed to get user data from /api/me:', data.error);
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
  
  // Define permission helper functions based on currentUser
  console.log('[UnifiedNavigation] Deriving roles - currentUser value IS:', currentUser);
  console.log('[UnifiedNavigation] Deriving roles - currentUser.user_metadata IS:', currentUser?.user_metadata);
  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];

  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isPlatformAdmin = isAdmin && userBrandPermissions.length === 0;
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;

  console.log('[UnifiedNavigation] Role Check:', { userRole, isViewer, isEditor, isAdmin, isPlatformAdmin, isScopedAdmin }); // Log role booleans

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
    // Conditional "All Content" link
    // Viewers/Editors see this, filtered by brand at page level
    // Admins see this, potentially filtered if Scoped Admin
    {
      href: '/dashboard/content',
      label: 'All Content',
      icon: <Folder className="h-5 w-5" />,
      segment: 'content' // Main segment for /dashboard/content/* routes
    },
    // Conditional "Content" group for creating new content from templates
    // This section will be dynamically filtered later for brand-specific templates
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      items: contentItems, // These will be filtered based on brand permissions
      segment: 'content-new', // A made-up segment, ensure isActive handles it or direct paths
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
      icon: <Folder className="h-5 w-5" />, // Using Folder, BookOpen is used for "Create Content" group
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
  
  // Filter navItems based on role
  let filteredNavItems = navItemsDefinition;

  if (isLoadingUser) {
    // Optionally show a loading state for navigation or return null
    return (
      <nav className="bg-card w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </nav>
    );
  }

  if (!currentUser) {
    // User not logged in or session error, perhaps show minimal nav or nothing
    // This case should ideally be handled by a higher-order component or redirect
    return null; 
  }

  if (isViewer) {
    filteredNavItems = navItemsDefinition.filter(item => 
      item.label === 'Dashboard' ||
      item.label === 'My Tasks' ||
      item.label === 'All Content' || // Viewers see this link, page content is filtered
      item.label === 'Content' || // Content creation group, items within will be filtered
      item.label === 'Tools'
    );
    console.log('[UnifiedNavigation] Viewer Items:', filteredNavItems.map(i => i.label)); // Log viewer items
  } else if (isEditor) {
    filteredNavItems = navItemsDefinition.filter(item => 
      item.label === 'Dashboard' ||
      item.label === 'My Tasks' ||
      item.label === 'All Content' || 
      item.label === 'Content' || 
      item.label === 'Tools'
    );
    console.log('[UnifiedNavigation] Editor Items:', filteredNavItems.map(i => i.label)); // Log editor items
  } else if (isScopedAdmin) {
    // Scoped Admins see more, but brand-related items are conceptually filtered at page/API level.
    // For nav links, they see the sections, but "Create New Brand" for example might be nuanced.
    // Based on NAVIGATION_PERMISSIONS.md, User Management is global.
    // Create New Brand/Workflow/Template might need to be global actions or hidden if strictly scoped.
    // For now, showing them; their actual capability is enforced by API / page.
    filteredNavItems = navItemsDefinition.filter(item => 
      item.label !== 'Users' // Show all except explicit global User Management, which is handled separately for Scoped Admin in docs
    );
     // Add Users back if it was filtered out, as Scoped Admins can manage users globally
    if (!filteredNavItems.find(item => item.label === 'Users')) {
      const usersItem = navItemsDefinition.find(item => item.label === 'Users');
      if (usersItem) filteredNavItems.push(usersItem);
    }
  } // PlatformAdmin sees all, so no filtering needed for navItemsDefinition by default.

  // Bottom nav items (settings, help) - always visible for logged-in users
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
  
  return (
    <nav className="bg-card w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
      <div className="space-y-8">
        <div className="space-y-1">
          {filteredNavItems.map((item, index) => (
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
          {currentUser && bottomNavItems.map((item) => (
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