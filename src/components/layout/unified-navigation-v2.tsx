'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments, useSearchParams } from 'next/navigation';
import {
  Home,
  GitBranch,
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
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { useBrands } from '@/contexts/brand-context';
import { useWorkflowsList } from '@/hooks/queries/use-workflows';

// Types remain the same
type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  segment?: string;
  badge?: string | number;
  show?: () => boolean;
  isNew?: boolean;
};

type NavGroupItem = {
  label: string;
  icon?: React.ReactNode;
  items: NavItem[];
  segment?: string;
  defaultOpen?: boolean;
  show?: () => boolean;
};

type NavDivider = {
  type: 'divider';
  show?: () => boolean;
};

type NavigationItem = NavItem | NavGroupItem | NavDivider;

interface UnifiedNavigationProps {
  className?: string;
}

/**
 * UnifiedNavigation component using the new auth context
 * This demonstrates how to migrate from direct API calls to using React Query and contexts
 */
export function UnifiedNavigationV2({ className }: UnifiedNavigationProps) {
  const pathname = usePathname() ?? '';
  const segments = useSelectedLayoutSegments() ?? [];
  const searchParams = useSearchParams();
  
  // Use auth context instead of local state
  const { user: currentUser, isLoading: isLoadingUser } = useAuth();
  const { isGlobalAdmin, hasBrandPermission } = usePermissions();
  const { brands } = useBrands();
  
  // Use React Query for workflows
  const { data: workflows = [] } = useWorkflowsList();
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [pendingTasksCount, setPendingTasksCount] = useState<number | null>(null);
  const tasksFetched = useRef(false);

  // Calculate permission flags
  const isAuthenticatedUser = !!currentUser;
  const isPlatformAdmin = isGlobalAdmin;
  const isScopedAdmin = brands.some(brand => hasBrandPermission(brand.id, 'admin'));
  const isEditor = !isPlatformAdmin && !isScopedAdmin && 
    brands.some(brand => hasBrandPermission(brand.id, 'editor'));
  const isViewer = !isPlatformAdmin && !isScopedAdmin && !isEditor;

  // Badge counts from React Query data
  const workflowBadge = workflows.length > 0 ? workflows.length : undefined;

  // Fetch pending tasks count (could be migrated to React Query hook)
  useEffect(() => {
    if (!isAuthenticatedUser || tasksFetched.current) return;
    
    const fetchPendingTasks = async () => {
      try {
        const response = await fetch('/api/me/tasks?status=pending', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setPendingTasksCount(data.data.length);
          }
        }
      } catch (error) {
        console.error('Error fetching pending tasks:', error);
      }
    };
    
    fetchPendingTasks();
    tasksFetched.current = true;
  }, [isAuthenticatedUser]);

  // Same navigation structure but using permission helpers
  const navItemsDefinition: NavigationItem[] = useMemo(() => [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: 'dashboard',
      show: () => isAuthenticatedUser
    },
    {
      href: '/dashboard/my-tasks',
      label: 'My Tasks',
      icon: <ListChecks className="h-5 w-5" />,
      segment: 'my-tasks',
      badge: pendingTasksCount || undefined,
      show: () => isAuthenticatedUser
    },
    { type: 'divider', show: () => isAuthenticatedUser },
    {
      label: 'Content',
      icon: <Folder className="h-5 w-5" />,
      segment: 'content',
      defaultOpen: true,
      show: () => isAuthenticatedUser,
      items: [
        { href: '/dashboard/content', label: 'All Content', icon: <FileText className="h-4 w-4" />, segment: 'content' },
        { href: '/dashboard/templates', label: 'Templates', icon: <FileText className="h-4 w-4" />, segment: 'templates' },
      ]
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows',
      badge: workflowBadge,
      show: () => isAuthenticatedUser && !isViewer
    },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands',
      show: () => isPlatformAdmin || isScopedAdmin
    },
    { type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      label: 'Claims',
      icon: <ShieldCheck className="h-5 w-5" />,
      segment: 'claims',
      defaultOpen: false,
      show: () => isAuthenticatedUser && !isViewer,
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
  ], [
    isAuthenticatedUser,
    pendingTasksCount,
    workflowBadge,
    isViewer,
    isPlatformAdmin,
    isScopedAdmin,
  ]);

  const topSegment = segments[0] || '';
  const secondSegment = segments[1] || '';

  // Rest of the component remains the same...
  const isActive = useCallback((item: NavItem | NavGroupItem) => {
    if ('href' in item && item.href && item.href.startsWith('/dashboard/content/new?template=')) {
      if (pathname === '/dashboard/content/new') {
        if (searchParams) {
          const templateIdFromQuery = searchParams.get('template');
          if (templateIdFromQuery && item.segment === templateIdFromQuery && topSegment === 'content') {
            return true;
          }
        }
      }
    }

    if ('href' in item && item.href && pathname.match(/\/dashboard\/content\/[^\/]+\/edit/)) {
       if (item.segment === 'content' && !item.href?.endsWith('/new')) return true;
    }

    if (item.segment) {
      if ('items' in item) {
        return item.segment === topSegment;
      } else if ('href' in item) {
        const parentGroup = navItemsDefinition.find(def => 
          'items' in def && def.items.some(subItem => 'href' in subItem && subItem.href === item.href)
        ) as NavGroupItem | undefined;

        if (parentGroup && parentGroup.segment) {
          return item.segment === secondSegment && parentGroup.segment === topSegment;
        } else {
          if (item.href === '/dashboard/content') {
            return item.segment === topSegment && pathname !== '/dashboard/content/new';
          } else {
            return item.segment === topSegment;
          }
        }
      }
    }

    if ('href' in item && item.href) {
      return pathname === item.href;
    }

    return false;
  }, [pathname, searchParams, topSegment, secondSegment, navItemsDefinition]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Initialize open groups
  useEffect(() => {
    const initialOpenGroups: Record<string, boolean> = {};
    navItemsDefinition.forEach(item => {
      if ('items' in item && item.defaultOpen) {
        initialOpenGroups[item.label] = true;
      }
      if ('items' in item && isActive(item)) {
        initialOpenGroups[item.label] = true;
      }
    });
    setOpenGroups(prev => ({ ...initialOpenGroups, ...prev }));
  }, [isActive, navItemsDefinition]);

  const filteredNavItems = navItemsDefinition.filter(item => !item.show || item.show());

  if (isLoadingUser) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-2", className)}>
      {filteredNavItems.map((item, index) => {
        if ('type' in item && item.type === 'divider') {
          return <Separator key={`divider-${index}`} className="my-2" />;
        }

        if ('items' in item) {
          const isGroupActive = isActive(item) || item.items.some(subItem => isActive(subItem));
          const isOpen = openGroups[item.label] ?? item.defaultOpen ?? false;

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isGroupActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {isOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.items.map((subItem) => {
                    const isSubItemActive = isActive(subItem);
                    
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isSubItemActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {subItem.icon}
                        <span className="flex-1">{subItem.label}</span>
                        {subItem.badge !== undefined && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                            {subItem.badge}
                          </span>
                        )}
                        {subItem.isNew && (
                          <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            NEW
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const navItem = item as NavItem;
        const isItemActive = isActive(navItem);
        
        return (
          <Link
            key={navItem.href}
            href={navItem.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isItemActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {navItem.icon}
            <span className="flex-1">{navItem.label}</span>
            {navItem.badge !== undefined && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {navItem.badge}
              </span>
            )}
            {navItem.isNew && (
              <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                NEW
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
