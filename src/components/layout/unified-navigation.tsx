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
  Globe,
  Folder,
  ListChecks,
  Loader2,
  MessageSquareWarning,
  Info,
  ClipboardList,
  FilePlus2,
  Package,
  FlaskConical,
  ShieldCheck,
  Settings2,
  ClipboardEdit,
  Globe2,
  SearchCheck,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
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

  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const templatesFetched = useRef(false);

  const [userWorkflows, setUserWorkflows] = useState<WorkflowDataType[]>([]);
  const [isLoadingUserWorkflows, setIsLoadingUserWorkflows] = useState(false);
  const userWorkflowsFetched = useRef(false);

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

  // Moved role constants declaration before the useEffect that uses them
  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];
  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isPlatformAdmin = isAdmin && userBrandPermissions.length === 0; 
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;

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
          console.error('[UnifiedNavigation] Failed to fetch templates:', data.error);
        }
      } catch (error) {
        console.error('[UnifiedNavigation] Error fetching templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [isLoadingTemplates]);

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
            console.error('[UnifiedNavigation] Failed to fetch user workflows:', data.error);
            toast.error('Could not load workflows for content creation links.');
            setUserWorkflows([]);
          }
        } catch (error) {
          console.error('[UnifiedNavigation] Error fetching user workflows:', error);
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
    if ((pathname.includes('/feedback') || pathname.includes('/admin/feedback-log')) && !expandedSections.feedback) {
      newExpandedState.feedback = true;
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

  let filteredContentItems: NavItem[] = [];
  if (isLoadingTemplates || ( (isScopedAdmin || isEditor) && isLoadingUserWorkflows && !isPlatformAdmin) ) {
    filteredContentItems = [
      { href: '#', label: 'Loading templates...', icon: <Loader2 className="h-4 w-4 animate-spin" />, segment: 'loading' }
    ];
  } else if (userTemplates.length > 0) {
    if (isPlatformAdmin) {
      filteredContentItems = userTemplates.map(template => ({
        href: `/dashboard/content/new?template=${template.id}`,
        label: template.name,
        icon: <FileText className="h-4 w-4" />,
        segment: template.id
      }));
    } else if (isScopedAdmin || isEditor) {
      const userBrandIds = (currentUser?.brand_permissions || []).map(p => p.brand_id).filter(Boolean);
      if (userBrandIds.length > 0 && userWorkflows.length > 0) {
        filteredContentItems = userTemplates
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
      } else {
        filteredContentItems = [];
      }
    } else {
      filteredContentItems = [];
    }
  }
  
  const hasAssignedBrandWithMasterClaimId = () => {
    if (!currentUser || !userBrandPermissions) return false;
    return userBrandPermissions.some(bp => bp.brand && bp.brand.master_claim_brand_id && bp.brand.master_claim_brand_id !== null);
  };
  
  const isAuthenticatedUser = currentUser != null;

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
      segment: 'content',
      defaultOpen: true,
      show: () => isAuthenticatedUser && !isViewer,
      items: filteredContentItems.length > 0 ? filteredContentItems : 
             (isLoadingTemplates || ((isScopedAdmin || isEditor) && isLoadingUserWorkflows && !isPlatformAdmin) ? 
               [{ href: '#', label: 'Loading...', icon: <Loader2 className="h-4 w-4 animate-spin" />, segment: 'loading' }] :
               [{ href: '#', label: 'No content types available', icon: <MessageSquareWarning className="h-4 w-4" />, segment: 'no-content' }])
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
        { href: '/dashboard/claims/preview', label: 'Claims Matrix', icon: <LayoutGrid className="h-4 w-4" />, segment: 'claims-matrix' },
        { href: '/dashboard/claims/definitions', label: 'Define Claims', icon: <BookOpen className="h-4 w-4" />, segment: 'definitions' },
        { href: '/dashboard/claims/overrides', label: 'Market Overrides', icon: <Globe2 className="h-4 w-4" />, segment: 'overrides' },
        { href: '/dashboard/claims/brand-review', label: 'Brand Claims Review', icon: <SearchCheck className="h-4 w-4" />, segment: 'brand-review' },
        { href: '/dashboard/claims/products', label: 'Products', icon: <Package className="h-4 w-4" />, segment: 'products' },
        { href: '/dashboard/claims/ingredients', label: 'Ingredients', icon: <FlaskConical className="h-4 w-4" />, segment: 'ingredients' },
        { href: '/dashboard/claims/brands', label: 'Claim Brands', icon: <Building2 className="h-4 w-4" />, segment: 'brands' },
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
      label: 'Feedback',
      icon: <MessageSquareWarning className="h-5 w-5" />,
      segment: 'feedback',
      defaultOpen: false,
      show: () => isAuthenticatedUser,
      items: [
        { 
          href: '/dashboard/admin/feedback-log',
          label: 'Submit Feedback',
          icon: <FilePlus2 className="h-4 w-4" />,
          segment: 'new'
        },
        { 
          href: '/dashboard/admin/feedback-log',
          label: 'Feedback Log',
          icon: <ListChecks className="h-4 w-4" />,
          segment: 'feedback-log'
        }
      ]
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
      href: '/dashboard/release-notes',
      label: 'Release Notes',
      icon: <Info className="h-5 w-5" />,
      segment: 'release-notes',
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
      let currentSecondSegment = segments[1] || '';

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

  if (isLoadingUser) {
    return (
      <aside className="sticky top-16 h-[calc(100vh-4rem)] hidden w-64 flex-col border-r bg-muted/40 sm:flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </aside>
    );
  }

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] hidden w-64 flex-col border-r bg-muted/40 sm:flex overflow-y-auto">
      <nav className="flex-1 px-4 py-4">
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
                          <li key={subItem.href}>
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
    </aside>
  );
}

export default UnifiedNavigation; 