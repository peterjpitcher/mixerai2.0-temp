'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';
import Image from 'next/image';
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
  Image as LucideImage,
  Globe,
  Folder,
  ListChecks,
  Loader2,
  MessageSquareWarning,
  Info,
  ClipboardList,
  LayoutGrid,
  FilePlus2,
  Package,
  FlaskConical,
  ShieldCheck,
  Settings2,
  ClipboardEdit,
  Globe2,
  SearchCheck
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
    role: string;
    // Updated to match the new /api/me response structure
    brand?: { 
      id: string; 
      name: string; 
      master_claim_brand_id?: string | null; 
    } | null;
  }>;
  // Add other fields that your session endpoint might return
}

// Define a type for spacer items
interface NavSpacer {
  type: 'divider';
  show?: () => boolean; // Optional show condition for spacers too
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
    feedback: false,
    'create-content': true,
    'product-claims': false,
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
          // console.log('[UnifiedNavigation] Current User:', data.user); // For debugging
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
  
  // --- Permission helper functions ---
  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];
  
  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isPlatformAdmin = isAdmin && userBrandPermissions.length === 0;
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;

  const hasAssignedBrandWithMasterClaimId = () => {
    if (!currentUser || !userBrandPermissions) return false;
    return userBrandPermissions.some(bp => bp.brand && bp.brand.master_claim_brand_id && bp.brand.master_claim_brand_id !== null);
  };
  
  const isAuthenticatedUser = currentUser != null;
  // --- End Permission helper functions ---

  // --- Logging for Global Admin Debugging ---
  if (currentUser?.user_metadata?.role === 'admin') {
    console.log('[UnifiedNavigation] For Admin User - currentUser:', JSON.stringify(currentUser, null, 2));
    console.log('[UnifiedNavigation] For Admin User - userRole:', userRole);
    console.log('[UnifiedNavigation] For Admin User - userBrandPermissions:', JSON.stringify(userBrandPermissions, null, 2));
    console.log('[UnifiedNavigation] For Admin User - userBrandPermissions.length:', userBrandPermissions.length);
    console.log('[UnifiedNavigation] For Admin User - isAdmin variable (should be true):', isAdmin);
    console.log('[UnifiedNavigation] For Admin User - isPlatformAdmin variable:', isPlatformAdmin);
    console.log('[UnifiedNavigation] For Admin User - isScopedAdmin variable:', isScopedAdmin);
  }
  // --- End Logging ---

  // --- Nav Item Definitions (Focus on "Create Content" and "Product Claims") ---
  let navItemsDefinition: (NavItem | NavGroupItem | NavSpacer & { show?: boolean | (() => boolean) })[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: '', 
      show: () => isAuthenticatedUser
    },
    {
      href: '/dashboard/my-tasks',
      label: 'My Tasks',
      icon: <ListChecks className="h-5 w-5" />,
      segment: 'my-tasks',
      show: () => isAuthenticatedUser
    },
    {
      href: '/dashboard/content',
      label: 'All Content',
      icon: <Folder className="h-5 w-5" />,
      segment: 'content',
      show: () => isAuthenticatedUser
    },
    {
      label: 'Create Content', 
      icon: <BookOpen className="h-5 w-5" />,
      items: contentItems, 
      segment: 'content-new', 
      defaultOpen: true,
      show: () => (isPlatformAdmin || isScopedAdmin || isEditor)
    },
    { type: 'divider' as const, show: () => (isPlatformAdmin || isScopedAdmin || isEditor) },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands',
      show: () => isPlatformAdmin || isScopedAdmin 
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows',
      show: () => isPlatformAdmin || isScopedAdmin
    },
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <ClipboardList className="h-5 w-5" />,
      segment: 'templates',
      show: () => isPlatformAdmin 
    },
    {
      label: 'Product Claims',
      icon: <ShieldCheck className="h-5 w-5" />,
      segment: 'product-claims-group',
      defaultOpen: false,
      show: () => {
        if (isPlatformAdmin) return true;
        if (isScopedAdmin || isEditor || isViewer) {
          return hasAssignedBrandWithMasterClaimId();
        }
        return false;
      },
      items: [
        {
          href: '/dashboard/claims/preview',
          label: 'Claims Matrix',
          icon: <LayoutGrid className="h-4 w-4" />,
          segment: 'claims-preview'
        },
        {
          href: '/dashboard/claims/definitions',
          label: 'Define Claims',
          icon: <ClipboardEdit className="h-4 w-4" />,
          segment: 'claims-definitions'
        },
        {
          href: '/dashboard/claims/overrides',
          label: 'Market Overrides',
          icon: <Globe2 className="h-4 w-4" />,
          segment: 'claims-overrides'
        },
        {
          label: 'Brand Claims Review',
          href: '/dashboard/claims/brand-review',
          icon: <SearchCheck className="h-4 w-4" />,
          segment: 'claims-brand-review'
        },
        {
          href: '/dashboard/claims/products',
          label: 'Products',
          icon: <Package className="h-4 w-4" />,
          segment: 'claims-manage-products'
        },
        {
          href: '/dashboard/claims/ingredients',
          label: 'Ingredients',
          icon: <FlaskConical className="h-4 w-4" />,
          segment: 'claims-manage-ingredients'
        },
        {
          href: '/dashboard/claims/brands',
          label: 'Claim Brands',
          icon: <Building2 className="h-4 w-4" />,
          segment: 'claims-manage-master-brands'
        }
      ]
    },
    { type: 'divider' as const, show: () => (isPlatformAdmin || isScopedAdmin || isEditor) },
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
          icon: <LucideImage className="h-4 w-4" />,
          segment: 'alt-text-generator'
        },
        {
          href: '/dashboard/tools/content-transcreator',
          label: 'Content Transcreator',
          icon: <Globe className="h-4 w-4" />,
          segment: 'content-transcreator'
        },
      ],
      show: () => isAuthenticatedUser 
    },
    
    { type: 'divider' as const, show: () => isAuthenticatedUser },
    {
      label: 'Feedback',
      icon: <MessageSquareWarning className="h-5 w-5" />,
      segment: 'feedback',
      defaultOpen: expandedSections.feedback,
      items: [
        {
          href: '/dashboard/feedback',
          label: 'View Feedback',
          icon: <Info className="h-4 w-4" />,
          segment: 'view-feedback' 
        },
        ...(isAdmin ? [{ 
            href: '/dashboard/admin/feedback-log',
            label: 'Feedback Log (Admin)',
            icon: <ListChecks className="h-4 w-4" />,
            segment: 'feedback-log'
        }] : [])
      ],
      show: () => isAuthenticatedUser 
    },
    { type: 'divider' as const, show: () => isAuthenticatedUser },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users', 
      show: () => isAdmin
    },
    {
      href: '/dashboard/account',
      label: 'Account',
      icon: <Settings2 className="h-5 w-5" />,
      segment: 'account',
      show: () => isAuthenticatedUser
    },
    {
      href: '/dashboard/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help',
      show: () => isAuthenticatedUser
    },
  ];
  
  // Filter nav items based on roles and conditions
  const finalNavItems = navItemsDefinition.filter(item => {
    if (isLoadingUser) return false;
    
    if ('show' in item && item.show !== undefined) {
      return typeof item.show === 'function' ? item.show() : item.show;
    }
    if ('type' in item && item.type === 'divider') return true;
    
    return true;
  });
  
  // Check if a navigation item is active based on the current URL path and segments
  const isActive = (item: NavItem | NavGroupItem) => {
    const currentTopSegment = segments[0];
    const currentSecondSegment = segments[1];

    if ('href' in item) {
      if (item.href === '/dashboard' && pathname === '/dashboard') return true;
      if (item.segment && currentTopSegment === item.segment) {
        if (pathname.startsWith(item.href)) {
            if (item.href === '/dashboard/content' && pathname === '/dashboard/content') return true;
            if (item.href !== '/dashboard/content' && pathname.startsWith(item.href)) return true;
        }
      }
      return pathname.startsWith(item.href) && item.href !== '/dashboard';
    }
    
    if ('items' in item) {
      if (item.segment && currentTopSegment === item.segment) {
        return true;
      }
      return item.items.some(subItem => {
        if (subItem.segment && pathname.includes(subItem.href)) {
            if (subItem.href.startsWith("/dashboard/content/new")) {
                const templateId = new URLSearchParams(window.location.search).get('template');
                return templateId === subItem.segment;
            }
            return segments.includes(subItem.segment);
        }
        return pathname === subItem.href;
      });
    }
    
    return false;
  };
  
  if (isLoadingUser) {
    return (
      <div className="bg-card w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-background">
      <div className="flex h-16 shrink-0 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" aria-label="Dashboard">
          <Image
            src="/Mixerai2.0Logo.png"
            alt="MixerAI 2.0 Logo"
            width={160}
            height={30}
            priority
          />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-8">
          <div className="space-y-1">
            {finalNavItems.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                if (index > 0 && index < finalNavItems.length -1) { 
                    const prevItem = finalNavItems[index-1];
                    const nextItem = finalNavItems[index+1];
                    if (prevItem && !('type' in prevItem && prevItem.type === 'divider') && 
                        nextItem && !('type' in nextItem && nextItem.type === 'divider')) {
                          return <hr key={`divider-${index}`} className="my-3 border-border/60" />;
                    }
                }
                return null;
              }
              if ('items' in item) {
                return (
                  <div key={index} className="space-y-1">
                    <button 
                      onClick={() => toggleSection(item.label.toLowerCase().replace(/\s+/g, '-'))}
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
                      {expandedSections[item.label.toLowerCase().replace(/\s+/g, '-')]
                        ? <ChevronDown className="h-4 w-4" /> 
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </button>
                    {expandedSections[item.label.toLowerCase().replace(/\s+/g, '-')] && (
                      <div className="pl-6 space-y-1 mt-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                              (segments.includes(subItem.segment || '') || pathname === subItem.href || (subItem.href.startsWith("/dashboard/content/new") && new URLSearchParams(window.location.search).get('template') === subItem.segment) )
                                ? "text-primary font-semibold"
                                : "text-muted-foreground hover:text-primary"
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
    </aside>
  );
}

export default UnifiedNavigation; 