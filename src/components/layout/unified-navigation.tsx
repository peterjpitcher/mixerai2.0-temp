'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments, useSearchParams } from 'next/navigation';
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
  Folder,
  ListChecks,
  Loader2,
  MessageSquareWarning,
  ClipboardList,
  Package,
  FlaskConical,
  ShieldCheck,
  Globe2,
  SearchCheck,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

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
    brand?: { 
      id: string; 
      name: string; 
      master_claim_brand_id?: string | null; 
    } | null;
  }>;
}

interface NavSpacer {
  type: 'divider';
  show?: () => boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  segment?: string;
}

interface NavGroupItem {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  segment?: string;
  defaultOpen?: boolean;
}

interface WorkflowDataType {
  id: string;
  template_id: string | null;
  brand_id: string;
}

export function UnifiedNavigation() {
  const pathname = usePathname() || '';
  const layoutSegments = useSelectedLayoutSegments();
  const segments = layoutSegments || [];
  const searchParams = useSearchParams();
  
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true,
    tools: true,
    feedback: false,
    'create-content': true,
    'product-claims': false,
  });

  const [userTemplates, setUserTemplates] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const templatesFetched = useRef(false);

  const [userWorkflows, setUserWorkflows] = useState<WorkflowDataType[]>([]);
  const [isLoadingUserWorkflows, setIsLoadingUserWorkflows] = useState(false);
  const userWorkflowsFetched = useRef(false);

  useEffect(() => {
    const fetchCurrentUser = async (retryCount = 0) => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent
        }); 
        
        if (!response.ok) {
          // If we get 401, user is not authenticated - this is expected
          if (response.status === 401) {
            setCurrentUser(null);
            return;
          }
          throw new Error(`Failed to fetch user session: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        // Only log non-network errors, network errors during navigation are expected
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          // This is likely a network error during navigation, retry once
          if (retryCount === 0) {
            setTimeout(() => fetchCurrentUser(1), 1000);
            return;
          }
        }
        // Only log critical errors, not expected network errors during navigation
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Moved role constants declaration before the useEffect that uses them
  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];
  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isPlatformAdmin = isAdmin && userBrandPermissions.length === 0; 
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;
  
  // Reset fetch flags when user changes
  useEffect(() => {
    if (currentUser) {
      // Reset fetch flags to ensure data is refetched for the current user
      templatesFetched.current = false;
      userWorkflowsFetched.current = false;
    }
  }, [currentUser]);

  useEffect(() => {
    // Only fetch templates after user is loaded and authenticated
    if (isLoadingUser || !currentUser) {
      // Skip template fetch if user is not ready
      return;
    }
    
    const fetchTemplates = async () => {
      // Check if already loading
      if (isLoadingTemplates) {
        // Already loading templates, skip
        return;
      }
      
      // Check if already fetched successfully
      if (templatesFetched.current && userTemplates.length > 0) {
        // Templates already fetched
        return;
      }
      
      // Start fetching templates
      
      setIsLoadingTemplates(true);
      
      try {
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        // Process templates API response
        
        if (data.success && data.templates) {
          setUserTemplates(data.templates);
          templatesFetched.current = true; // Only set to true on success
          // Templates loaded successfully
        } else {
          // Failed to fetch templates
          setUserTemplates([]);
          templatesFetched.current = false; // Reset on failure
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        setUserTemplates([]);
        templatesFetched.current = false; // Reset on error
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, [isLoadingUser, currentUser, userRole, isPlatformAdmin, isScopedAdmin, isLoadingTemplates, userTemplates.length]);

  useEffect(() => {
    const fetchUserWorkflows = async () => {
      if (userWorkflowsFetched.current || isLoadingUserWorkflows || !currentUser || isPlatformAdmin || isViewer) {
        if (!currentUser || isPlatformAdmin || isViewer) setIsLoadingUserWorkflows(false);
        return;
      }

      if (isScopedAdmin || isEditor) {
        setIsLoadingUserWorkflows(true);
        userWorkflowsFetched.current = true;
        try {
          const response = await fetch('/api/workflows'); 
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setUserWorkflows(data.data as WorkflowDataType[]);
          } else {
            // Failed to fetch user workflows
            toast.error('Could not load workflows for content creation links.');
            setUserWorkflows([]);
          }
        } catch (error) {
          console.error('Error fetching user workflows:', error);
          toast.error('Error loading workflows for navigation.');
          setUserWorkflows([]);
        } finally {
          setIsLoadingUserWorkflows(false);
        }
      }
    };

    if (!isLoadingUser) {
        fetchUserWorkflows();
    }
  }, [currentUser, isLoadingUser, isPlatformAdmin, isScopedAdmin, isEditor, isViewer, isLoadingUserWorkflows]);

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
  }, [pathname, expandedSections]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate filtered content items reactively using useMemo
  const filteredContentItems = useMemo<NavItem[]>(() => {
    // Don't show templates until we know the user's role
    if (isLoadingUser) {
      return [
        { href: '#', label: 'Loading...', icon: <Loader2 className="h-4 w-4 animate-spin" />, segment: 'loading' }
      ];
    }
    
    if (isLoadingTemplates || ((isScopedAdmin || isEditor) && isLoadingUserWorkflows && !isPlatformAdmin)) {
      return [
        { href: '#', label: 'Loading templates...', icon: <Loader2 className="h-4 w-4 animate-spin" />, segment: 'loading' }
      ];
    }
    
    // Calculate filtered content items based on user role and templates
    
    if (userTemplates.length > 0) {
      // Templates available for filtering
      
      if (isPlatformAdmin) {
        const items = userTemplates.map(template => ({
          href: `/dashboard/content/new?template=${template.id}`,
          label: template.name,
          icon: <FileText className="h-4 w-4" />,
          segment: template.id
        }));
        // Platform Admin - Return all templates
        return items;
      } else if (isScopedAdmin) {
        // Scoped admins should see all templates - they can create content for their brands
        const items = userTemplates.map(template => ({
          href: `/dashboard/content/new?template=${template.id}`,
          label: template.name,
          icon: <FileText className="h-4 w-4" />,
          segment: template.id
        }));
        // Scoped Admin - Show all templates
        return items;
      } else if (isEditor) {
        // Editors see templates based on workflows for their brands
        const userBrandIds = (currentUser?.brand_permissions || []).map(p => p.brand_id).filter(Boolean);
        if (userBrandIds.length > 0 && userWorkflows.length > 0) {
          const items = userTemplates
            .filter(template => 
              userWorkflows.some(workflow => 
                workflow.template_id === template.id && 
                userBrandIds.includes(workflow.brand_id)
              )
            )
            .map(template => ({
              href: `/dashboard/content/new?template=${template.id}`,
              label: template.name,
              icon: <FileText className="h-4 w-4" />,
              segment: template.id
            }));
          return items;
        }
        // If no workflows, still show all templates for editors
        const items = userTemplates.map(template => ({
          href: `/dashboard/content/new?template=${template.id}`,
          label: template.name,
          icon: <FileText className="h-4 w-4" />,
          segment: template.id
        }));
        // Editor - Show all templates (no workflow filtering)
        return items;
      } else {
        // Not admin or editor - no templates shown
        return [];
      }
    } else {
      // No templates to display
      
      // If we're still loading, show loading state
      if (isLoadingTemplates) {
        return [
          { href: '#', label: 'Loading templates...', icon: <Loader2 className="h-4 w-4 animate-spin" />, segment: 'loading' }
        ];
      }
      
      return [];
    }
  }, [
    isLoadingUser,
    isLoadingTemplates,
    isLoadingUserWorkflows,
    userTemplates,
    isPlatformAdmin,
    isScopedAdmin,
    isEditor,
    currentUser,
    userWorkflows
  ]);
  
  const hasAssignedBrandWithMasterClaimId = () => {
    if (!currentUser || !userBrandPermissions) return false;
    return userBrandPermissions.some(bp => bp.brand && bp.brand.master_claim_brand_id && bp.brand.master_claim_brand_id !== null);
  };
  
  const isAuthenticatedUser = currentUser != null;

  const navItemsDefinition: (NavItem | NavGroupItem | NavSpacer & { show?: boolean | (() => boolean) })[] = [
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
      segment: 'content',
      defaultOpen: true,
      show: () => isAuthenticatedUser && !isViewer,
      items: filteredContentItems.length > 0 ? filteredContentItems : 
             [{ href: '#', label: 'No content types available', icon: <MessageSquareWarning className="h-4 w-4" />, segment: 'no-content' }]
    },
    { type: 'divider', show: () => isAuthenticatedUser },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin)
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin)
    },
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <ClipboardList className="h-5 w-5" />,
      segment: 'templates',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin)
    },
    {
      label: 'Product Claims',
      icon: <ShieldCheck className="h-5 w-5" />,
      segment: 'claims',
      defaultOpen: false,
      show: () => isPlatformAdmin || isScopedAdmin || (isEditor && hasAssignedBrandWithMasterClaimId()),
      items: [
        { href: '/dashboard/claims', label: 'Claims', icon: <ShieldCheck className="h-4 w-4" />, segment: 'claims' },
        { href: '/dashboard/claims/pending-approval', label: 'Pending', icon: <ClipboardList className="h-4 w-4" />, segment: 'pending-approval' },
        { href: '/dashboard/claims/preview', label: 'Matrix', icon: <LayoutGrid className="h-4 w-4" />, segment: 'claims-matrix' },
        { href: '/dashboard/claims/workflows', label: 'Workflows', icon: <GitBranch className="h-4 w-4" />, segment: 'workflows' },
        { href: '/dashboard/claims/overrides', label: 'Overrides', icon: <Globe2 className="h-4 w-4" />, segment: 'overrides' },
        { href: '/dashboard/claims/brand-review', label: 'Review', icon: <SearchCheck className="h-4 w-4" />, segment: 'brand-review' },
        { href: '/dashboard/claims/products', label: 'Products', icon: <Package className="h-4 w-4" />, segment: 'products' },
        { href: '/dashboard/claims/ingredients', label: 'Ingredients', icon: <FlaskConical className="h-4 w-4" />, segment: 'ingredients' },
        { href: '/dashboard/claims/brands', label: 'Brands', icon: <Building2 className="h-4 w-4" />, segment: 'brands' },
      ]
    },
    { type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      label: 'Tools',
      icon: <Wrench className="h-5 w-5" />,
      segment: 'tools',
      defaultOpen: true,
      show: () => isAuthenticatedUser && !isViewer,
      items: [
        { href: '/dashboard/tools/metadata-generator', label: 'Metadata Generator', icon: <Code className="h-4 w-4" />, segment: 'metadata-generator' },
        { href: '/dashboard/tools/alt-text-generator', label: 'Alt Text Generator', icon: <LucideImage className="h-4 w-4" />, segment: 'alt-text-generator' },
        { href: '/dashboard/tools/content-transcreator', label: 'Content Transcreator', icon: <Globe2 className="h-4 w-4" />, segment: 'content-transcreator' },
      ]
    },
    { type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      href: '/dashboard/issues',
      label: 'Issues',
      icon: <MessageSquareWarning className="h-5 w-5" />,
      segment: 'issues',
      show: () => isPlatformAdmin
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users',
      show: () => isPlatformAdmin || isScopedAdmin
    },
    {
      href: '/dashboard/account',
      label: 'Account',
      icon: <Settings className="h-5 w-5" />,
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
  
  const isActive = (item: NavItem | NavGroupItem) => {
    if ('href' in item && item.href && item.href.startsWith('/dashboard/content/new?template=')) {
      if (pathname === '/dashboard/content/new') {
        if (searchParams) {
          const templateIdFromQuery = searchParams.get('template');
          if (templateIdFromQuery && item.segment === templateIdFromQuery && segments[0] === 'content') {
            return true;
          }
        }
      }
    }

    if ('href' in item && item.href && pathname.match(/\/dashboard\/content\/[^\/]+\/edit/)) {
       if (item.segment === 'content' && !item.href?.endsWith('/new')) return true;
    }

    if (item.segment) {
      const currentTopSegment = segments[0] || '';
      const currentSecondSegment = segments[1] || '';

      if ('items' in item) {
        return item.segment === currentTopSegment;
      } else if ('href' in item) {
        const parentGroup = navItemsDefinition.find(def => 
          'items' in def && def.items.some(subItem => 'href' in subItem && subItem.href === item.href)
        ) as NavGroupItem | undefined;

        if (parentGroup && parentGroup.segment) {
          return item.segment === currentSecondSegment && parentGroup.segment === currentTopSegment;
        } else {
          if (item.href === '/dashboard/content') {
            return item.segment === currentTopSegment && pathname !== '/dashboard/content/new';
          } else {
            return item.segment === currentTopSegment;
          }
        }
      }
    }
    
    if ('href' in item && item.href && !item.segment && pathname === item.href) return true;

    return false;
  };

  // Component state is now managed without debug logging

  if (isLoadingUser) {
    return (
      <aside className="sticky top-16 h-[calc(100vh-4rem)] hidden w-64 flex-col border-r bg-muted/40 sm:flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </aside>
    );
  }

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] hidden w-64 flex-col border-r bg-muted/40 sm:flex">
      <div className="flex-1 overflow-y-auto">
        <nav className="px-4 py-4">
          <ul className="space-y-1">
            {navItemsDefinition.map((navElement, index) => {
            const showItem = !('show' in navElement && navElement.show !== undefined) || (typeof navElement.show === 'function' ? navElement.show() : navElement.show);
            if (!showItem) return null;

            if ('type' in navElement && navElement.type === 'divider') {
              return <Separator key={`divider-${index}`} className="my-2" />;
            }

            if ('items' in navElement) {
              const group = navElement as NavGroupItem;
              const isOpen = expandedSections[group.label] ?? group.defaultOpen ?? isActive(group);

              return (
                <li key={group.label}>
                  <button
                    onClick={() => toggleSection(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      "hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive(group) ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {group.icon}
                      <span>{group.label}</span>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted py-1 pl-4">
                      {group.items.map(subItem => {
                        const subIsActive = isActive(subItem);
                        if (subItem.segment === 'loading' || subItem.segment === 'no-content') {
                          return (
                            <li key={subItem.label} className="flex items-center gap-3 rounded-md px-3 py-1 text-sm text-muted-foreground">
                              {subItem.icon}<span>{subItem.label}</span>
                            </li>
                          );
                        }
                        return (
                          <li key={subItem.segment || subItem.label || subItem.href}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                "group flex items-center gap-3 rounded-md px-3 py-1 text-sm font-medium leading-tight",
                                "hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                subIsActive
                                  ? (group.label === 'Create Content'
                                      ? "bg-red-600 text-white"
                                      : "bg-muted text-primary")
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {subItem.icon}
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            } else {
              const navLink = navElement as NavItem;
              const isLinkActive = isActive(navLink);
              return (
                <li key={navLink.href}>
                  <Link
                    href={navLink.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-1 text-sm font-medium",
                      "hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isLinkActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {navLink.icon}
                    {navLink.label}
                  </Link>
                </li>
              );
            }
          })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

export default UnifiedNavigation; 
