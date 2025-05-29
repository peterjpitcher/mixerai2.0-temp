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

  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const templatesFetched = useRef(false);

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

  const contentItems = userTemplates.map(template => ({
    href: `/dashboard/content/new?template=${template.id}`,
    label: template.name,
    icon: <FileText className="h-4 w-4" />,
    segment: template.id
  }));
  
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
    { type: 'divider', show: () => isAuthenticatedUser },
    {
      label: 'Create Content',
      icon: <FilePlus2 className="h-5 w-5" />,
      segment: 'content',
      defaultOpen: true,
      show: () => !isViewer,
      items: [
        { 
          href: '/dashboard/content/new', 
          label: 'Create New', 
          icon: <FilePlus2 className="h-4 w-4" />, 
          segment: 'new' 
        },
        ...(isLoadingTemplates 
          ? [{ href: '#', label: 'Loading templates...', icon: <Loader2 className="h-4 w-4 animate-spin" /> }] 
          : contentItems
        ),
      ]
    },
    {
      href: '/dashboard/content',
      label: 'Manage Content',
      icon: <ClipboardList className="h-5 w-5" />,
      segment: 'content', 
      show: () => isAuthenticatedUser
    },
    { type: 'divider', show: () => isAuthenticatedUser && !isViewer },
    {
      label: 'Product Claims',
      icon: <ShieldCheck className="h-5 w-5" />,
      segment: 'claims',
      defaultOpen: false,
      show: () => isPlatformAdmin || isScopedAdmin || (isEditor && hasAssignedBrandWithMasterClaimId()),
      items: [
        { href: '/dashboard/claims/brands', label: 'Claim Brands', icon: <Building2 className="h-4 w-4" />, segment: 'brands' },
        { href: '/dashboard/claims/products', label: 'Claim Products', icon: <Package className="h-4 w-4" />, segment: 'products' },
        { href: '/dashboard/claims/ingredients', label: 'Claim Ingredients', icon: <FlaskConical className="h-4 w-4" />, segment: 'ingredients' },
        { href: '/dashboard/claims/definitions', label: 'Claim Definitions', icon: <BookOpen className="h-4 w-4" />, segment: 'definitions' },
      ]
    },
    {
      href: '/dashboard/brands',
      label: 'Manage Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin || isEditor)
    },
    {
      href: '/dashboard/templates',
      label: 'Content Templates',
      icon: <ClipboardEdit className="h-5 w-5" />,
      segment: 'templates',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin || isEditor)
    },
    {
      href: '/dashboard/workflows',
      label: 'Manage Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows',
      show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin || isEditor)
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
      label: 'Admin Settings',
      icon: <Settings2 className="h-5 w-5" />,
      segment: 'admin',
      defaultOpen: false,
      show: () => isPlatformAdmin || isScopedAdmin,
      items: [
        ...(isPlatformAdmin ? [
          { href: '/dashboard/admin/global-claim-brands', label: 'Global Claim Brands', icon: <Globe className="h-4 w-4" />, segment: 'global-claim-brands' },
          { href: '/dashboard/admin/master-claim-brands', label: 'Master Claim Brands', icon: <ShieldCheck className="h-4 w-4" />, segment: 'master-claim-brands' },
          { href: '/dashboard/admin/ingredients', label: 'Ingredients DB', icon: <FlaskConical className="h-4 w-4" />, segment: 'ingredients' },
          { href: '/dashboard/admin/products', label: 'Products DB', icon: <Package className="h-4 w-4" />, segment: 'products' },
          { href: '/dashboard/admin/claims-matrix', label: 'Claims Matrix', icon: <SearchCheck className="h-4 w-4" />, segment: 'claims-matrix' },
        ] : []),
        { href: '/dashboard/users', label: 'User Management', icon: <Users className="h-4 w-4" />, segment: 'users' },
         { href: '/dashboard/admin/feedback-log', label: 'Feedback Log', icon: <MessageSquareWarning className="h-4 w-4" />, segment: 'feedback-log' },
      ]
    },
    { type: 'divider', show: () => isAuthenticatedUser },
    {
      label: 'Feedback',
      icon: <MessageSquareWarning className="h-5 w-5" />,
      segment: 'feedback',
      defaultOpen: false,
      show: () => isAuthenticatedUser,
      items: [
        { 
          href: '/dashboard/feedback/new', 
          label: 'Submit Feedback', 
          icon: <FilePlus2 className="h-4 w-4" />, 
          segment: 'new'
        },
      ]
    },
    {
      href: '/dashboard/help',
      label: 'Help & Support',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help',
      show: () => isAuthenticatedUser
    },
    {
      href: '/dashboard/account',
      label: 'My Account',
      icon: <Settings className="h-5 w-5" />,
      segment: 'account',
      show: () => isAuthenticatedUser
    },
  ];
  
  const isActive = (item: NavItem | NavGroupItem) => {
    if ('href' in item && item.href) { 
      if (!item.segment && pathname === item.href) return true;
      if (pathname.startsWith('/dashboard/content/new?template=')) {
        const templateId = pathname.split('template=')[1];
        if (item.segment === templateId && segments[0] === 'content') return true;
      }
      if (pathname.match(/\/dashboard\/content\/[^\/]+\/edit/)) {
         if (item.segment === 'content' && !item.href?.endsWith('/new')) return true;
      }
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
          return item.segment === currentTopSegment;
        }
      }
    }
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
                        if (subItem.label === 'Loading templates...') {
                          return (
                            <li key="loading-templates" className="flex items-center gap-3 rounded-md px-3 py-1 text-sm text-muted-foreground">
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
                                  ? "bg-muted text-primary"
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