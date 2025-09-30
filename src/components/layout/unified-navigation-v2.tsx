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
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { useBrands } from '@/contexts/brand-context';
import { useWorkflowsList } from '@/hooks/queries/use-workflows';
import { apiFetchJson } from '@/lib/api-client';

interface NavigationBase {
  id: string;
  show?: () => boolean;
}

interface NavItem extends NavigationBase {
  href: string;
  label: string;
  icon?: React.ReactNode;
  segment?: string;
  badge?: string | number;
  isNew?: boolean;
}

interface NavGroupItem extends NavigationBase {
  label: string;
  icon?: React.ReactNode;
  items: NavItem[];
  segment?: string;
  defaultOpen?: boolean;
}

interface NavDivider extends NavigationBase {
  type: 'divider';
}

type NavigationItem = NavItem | NavGroupItem | NavDivider;

interface UnifiedNavigationProps {
  className?: string;
}

interface TemplateSummary {
  id: string;
  name: string;
}

interface TemplatesResponse {
  success: boolean;
  templates?: TemplateSummary[];
  data?: TemplateSummary[];
}

export function UnifiedNavigationV2({ className }: UnifiedNavigationProps) {
  const pathname = usePathname() ?? '';
  const selectedSegments = useSelectedLayoutSegments();
  const segments = useMemo(() => selectedSegments ?? [], [selectedSegments]);
  const segmentsKey = useMemo(() => segments.join('/'), [segments]);
  const searchParams = useSearchParams();

  const { user: currentUser, isLoading: isLoadingUser } = useAuth();
  const { isGlobalAdmin, hasBrandPermission } = usePermissions();
  const { brands } = useBrands();
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useWorkflowsList();
  const { data: pendingTasksCount = 0 } = usePendingTasksCount(currentUser?.id);

  const roleFlags = useMemo(() => deriveRoleFlags({
    user: currentUser,
    isGlobalAdmin,
    brands,
    hasBrandPermission,
  }), [currentUser, isGlobalAdmin, brands, hasBrandPermission]);

  const { isAuthenticatedUser, isPlatformAdmin, isScopedAdmin, isEditor, isViewer } = roleFlags;

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['content-templates'],
    enabled: isAuthenticatedUser && !isViewer,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const result = await apiFetchJson<TemplatesResponse>('/api/content-templates', {
        errorMessage: 'Failed to load templates',
      });

      if (result?.success) {
        if (Array.isArray(result.templates)) return result.templates;
        if (Array.isArray(result.data)) return result.data;
      }

      return [];
    },
  });

  const { data: contentCount = 0 } = useContentCount(isAuthenticatedUser && !isViewer);

  const createContentItems = useMemo(() => {
    if (!isAuthenticatedUser || isViewer) return [];
    if (isLoadingTemplates || isLoadingWorkflows || isLoadingUser) {
      return [
        {
          id: 'loading-templates',
          href: '#',
          label: 'Loading content types...',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          segment: 'loading',
        },
      ];
    }

    if (!templates.length) return [];

    if (isPlatformAdmin || isScopedAdmin) {
      return templates.map((template) => ({
        id: `template-${template.id}`,
        href: `/dashboard/content/new?template=${template.id}`,
        label: template.name,
        icon: <FileText className="h-4 w-4" />,
        segment: template.id,
      }));
    }

    if (isEditor) {
      const brandIds = getBrandIdsForUser(currentUser);
      const templateIdsForUser = new Set(
        workflows
          .filter((workflow) => brandIds.has(workflow.brand_id))
          .map((workflow) => workflow.template_id)
          .filter((value): value is string => Boolean(value))
      );

      return templates
        .filter((template) => templateIdsForUser.size === 0 || templateIdsForUser.has(template.id))
        .map((template) => ({
          id: `template-${template.id}`,
          href: `/dashboard/content/new?template=${template.id}`,
          label: template.name,
          icon: <FileText className="h-4 w-4" />,
          segment: template.id,
        }));
    }

    return [];
  }, [
    currentUser,
    isAuthenticatedUser,
    isEditor,
    isPlatformAdmin,
    isScopedAdmin,
    isViewer,
    isLoadingTemplates,
    isLoadingUser,
    isLoadingWorkflows,
    templates,
    workflows,
  ]);

  const hasClaimsAccess = useMemo(() => {
    const permissions = currentUser?.brand_permissions ?? [];
    return permissions.some((permission) => permission.brand?.master_claim_brand_id);
  }, [currentUser]);

  const workflowBadge = workflows.length > 0 ? workflows.length : undefined;

  const navItemsDefinition: NavigationItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: 'dashboard',
      show: () => isAuthenticatedUser,
    },
    {
      id: 'nav-tasks',
      href: '/dashboard/my-tasks',
      label: 'My Tasks',
      icon: <ListChecks className="h-5 w-5" />,
      segment: 'my-tasks',
      badge: pendingTasksCount,
      show: () => isAuthenticatedUser,
    },
    { id: 'divider-1', type: 'divider', show: () => isAuthenticatedUser },
    {
      id: 'group-content',
      label: 'Content',
      icon: <Folder className="h-5 w-5" />,
      segment: 'content',
      defaultOpen: true,
      show: () => isAuthenticatedUser,
      items: [
        {
          id: 'nav-all-content',
          href: '/dashboard/content',
          label: 'All Content',
          icon: <FileText className="h-4 w-4" />,
          segment: 'content',
          badge: contentCount,
        },
        {
          id: 'nav-templates',
          href: '/dashboard/templates',
          label: 'Templates',
          icon: <FileText className="h-4 w-4" />,
          segment: 'templates',
          badge: templates.length,
        },
      ],
    },
    {
      id: 'group-create-content',
      label: 'Create Content',
      icon: <BookOpen className="h-5 w-5" />,
      segment: 'create-content',
      defaultOpen: true,
      show: () => isAuthenticatedUser && !isViewer,
      items: createContentItems,
    },
    {
      id: 'nav-workflows',
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows',
      badge: workflowBadge,
      show: () => isAuthenticatedUser && !isViewer,
    },
    {
      id: 'nav-brands',
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands',
      badge: brands.length,
      show: () => isPlatformAdmin || isScopedAdmin,
    },
    { id: 'divider-2', type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      id: 'group-claims',
      label: 'Claims',
      icon: <ShieldCheck className="h-5 w-5" />,
      segment: 'claims',
      defaultOpen: false,
      show: () => (isPlatformAdmin || isScopedAdmin || hasClaimsAccess) && !isViewer,
      items: [
        { id: 'claims-home', href: '/dashboard/claims', label: 'Claims', icon: <ShieldCheck className="h-4 w-4" />, segment: 'claims' },
        { id: 'claims-pending', href: '/dashboard/claims/pending-approval', label: 'Pending', icon: <ClipboardList className="h-4 w-4" />, segment: 'pending-approval' },
        { id: 'claims-matrix', href: '/dashboard/claims/preview', label: 'Matrix', icon: <LayoutGrid className="h-4 w-4" />, segment: 'claims-matrix' },
        { id: 'claims-workflows', href: '/dashboard/claims/workflows', label: 'Workflows', icon: <GitBranch className="h-4 w-4" />, segment: 'workflows' },
        { id: 'claims-overrides', href: '/dashboard/claims/overrides', label: 'Overrides', icon: <Globe2 className="h-4 w-4" />, segment: 'overrides' },
        { id: 'claims-review', href: '/dashboard/claims/brand-review', label: 'Review', icon: <SearchCheck className="h-4 w-4" />, segment: 'brand-review' },
        { id: 'claims-products', href: '/dashboard/claims/products', label: 'Products', icon: <Package className="h-4 w-4" />, segment: 'products' },
        { id: 'claims-ingredients', href: '/dashboard/claims/ingredients', label: 'Ingredients', icon: <FlaskConical className="h-4 w-4" />, segment: 'ingredients' },
        { id: 'claims-brands', href: '/dashboard/claims/brands', label: 'Brands', icon: <Building2 className="h-4 w-4" />, segment: 'brands' },
      ],
    },
    { id: 'divider-3', type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      id: 'group-tools',
      label: 'Tools',
      icon: <Wrench className="h-5 w-5" />,
      segment: 'tools',
      defaultOpen: true,
      show: () => isAuthenticatedUser && !isViewer,
      items: [
        { id: 'tool-metadata', href: '/dashboard/tools/metadata-generator', label: 'Metadata Generator', icon: <Code className="h-4 w-4" />, segment: 'metadata-generator' },
        { id: 'tool-alt-text', href: '/dashboard/tools/alt-text-generator', label: 'Alt Text Generator', icon: <LucideImage className="h-4 w-4" />, segment: 'alt-text-generator' },
        { id: 'tool-transcreator', href: '/dashboard/tools/content-transcreator', label: 'Content Transcreator', icon: <Globe2 className="h-4 w-4" />, segment: 'content-transcreator' },
      ],
    },
    { id: 'divider-4', type: 'divider', show: () => isAuthenticatedUser && (isPlatformAdmin || isScopedAdmin) },
    {
      id: 'nav-issues',
      href: '/dashboard/issues',
      label: 'Issues',
      icon: <MessageSquareWarning className="h-5 w-5" />,
      segment: 'issues',
      show: () => isPlatformAdmin,
    },
    {
      id: 'nav-users',
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users',
      show: () => isPlatformAdmin || isScopedAdmin,
    },
    {
      id: 'nav-account',
      href: '/dashboard/account',
      label: 'Account',
      icon: <Settings className="h-5 w-5" />,
      segment: 'account',
      show: () => isAuthenticatedUser,
    },
    {
      id: 'nav-help',
      href: '/dashboard/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help',
      show: () => isAuthenticatedUser,
    },
  ], [
    brands.length,
    contentCount,
    createContentItems,
    hasClaimsAccess,
    isAuthenticatedUser,
    isPlatformAdmin,
    isScopedAdmin,
    isViewer,
    pendingTasksCount,
    templates.length,
    workflowBadge,
  ]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    navItemsDefinition.forEach((item) => {
      if ('items' in item) {
        const shouldOpen = item.defaultOpen || item.items.some((child) => isItemActive(child, pathname, segments, searchParams, navItemsDefinition));
        if (shouldOpen) {
          initialOpen[item.id] = true;
        }
      }
    });
    setOpenGroups((prev) => ({ ...initialOpen, ...prev }));
  }, [navItemsDefinition, pathname, segmentsKey, segments, searchParams]);

  const filteredItems = useMemo(
    () => navItemsDefinition.filter((item) => !item.show || item.show()),
    [navItemsDefinition]
  );

  useEffect(() => {
    console.debug('[UnifiedNavigationV2] pathname', pathname, 'segments', segments);
  }, [pathname, segmentsKey]);

  const handleToggle = useCallback((id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (isLoadingUser) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <nav className={cn('flex h-full flex-col gap-2 overflow-y-auto px-4 py-4', className)}>
      {filteredItems.map((item) => {
        if ('type' in item) {
          return <Separator key={item.id} className="my-2" />;
        }

        if ('items' in item) {
          const isActiveGroup = isItemActive(item, pathname, segments, searchParams, navItemsDefinition) || item.items.some((child) => isItemActive(child, pathname, segments, searchParams, navItemsDefinition));
          const isOpen = openGroups[item.id] ?? item.defaultOpen ?? false;
          const hasChildren = item.items.length > 0;

          return (
            <div key={item.id}>
              <button
                onClick={() => handleToggle(item.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActiveGroup ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {isOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {hasChildren ? (
                    item.items.map((subItem) => {
                      if (subItem.href === '#') {
                        return (
                          <div
                            key={subItem.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                          >
                            {subItem.icon}
                            <span>{subItem.label}</span>
                          </div>
                        );
                      }
                      const active = isItemActive(subItem, pathname, segments, searchParams, navItemsDefinition);
                      return (
                        <Link
                          key={subItem.id}
                          href={subItem.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
                    })
                  ) : (
                    <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      No content types available for your role yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        const active = isItemActive(item, pathname, segments, searchParams, navItemsDefinition);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
            {item.isNew && (
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

function usePendingTasksCount(userId?: string | null) {
  return useQuery({
    queryKey: ['pending-tasks', userId],
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await apiFetchJson<{ success: boolean; data?: unknown[] }>('/api/me/tasks?status=pending', {
        errorMessage: 'Failed to fetch pending tasks',
      });

      if (response?.success && Array.isArray(response.data)) {
        return response.data.length;
      }

      return 0;
    },
  });
}

function useContentCount(enabled: boolean) {
  return useQuery({
    queryKey: ['content-count'],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetchJson<{ success: boolean; pagination?: { total?: number } }>(
        '/api/content?status=all&limit=1&page=1',
        {
          errorMessage: 'Failed to fetch content count',
        }
      );

      if (response?.success && response.pagination && typeof response.pagination.total === 'number') {
        return response.pagination.total;
      }

      return 0;
    },
  });
}

export function deriveRoleFlags({
  user,
  isGlobalAdmin,
  brands,
  hasBrandPermission,
}: {
  user: ReturnType<typeof useAuth>['user'];
  isGlobalAdmin: boolean;
  brands: ReturnType<typeof useBrands>['brands'];
  hasBrandPermission: ReturnType<typeof usePermissions>['hasBrandPermission'];
}) {
  const isAuthenticatedUser = Boolean(user);
  const isPlatformAdmin = Boolean(user) && isGlobalAdmin;
  const hasScopedAdminAccess = brands.some((brand) => hasBrandPermission(brand.id, 'admin'));
  const hasScopedEditorAccess = brands.some((brand) => hasBrandPermission(brand.id, 'editor'));

  const isScopedAdmin = !isPlatformAdmin && hasScopedAdminAccess;
  const isEditor = !isPlatformAdmin && !isScopedAdmin && hasScopedEditorAccess;
  const isViewer = Boolean(user) && !isPlatformAdmin && !isScopedAdmin && !isEditor;

  return { isAuthenticatedUser, isPlatformAdmin, isScopedAdmin, isEditor, isViewer };
}

function getBrandIdsForUser(user: ReturnType<typeof useAuth>['user']) {
  const permissions = user?.brand_permissions ?? [];
  return new Set(permissions.map((permission) => permission.brand_id).filter(Boolean) as string[]);
}

function isItemActive(
  item: NavItem | NavGroupItem,
  pathname: string,
  segments: ReturnType<typeof useSelectedLayoutSegments>,
  searchParams: ReturnType<typeof useSearchParams>,
  navItems: NavigationItem[],
) {
  if ('href' in item && item.href.startsWith('/dashboard/content/new?template=')) {
    if (pathname === '/dashboard/content/new') {
      const templateId = searchParams?.get('template');
      if (templateId && item.segment === templateId && segments?.[0] === 'content') {
        return true;
      }
    }
  }

  if ('href' in item && pathname.match(/\/dashboard\/content\/[^\/]+\/edit/)) {
    if (item.segment === 'content' && !item.href.endsWith('/new')) {
      return true;
    }
  }

  if (item.segment) {
    const topSegment = segments?.[0] || '';
    const secondSegment = segments?.[1] || '';

    if ('items' in item) {
      return item.segment === topSegment;
    }

    const parentGroup = navItems.find((navItem): navItem is NavGroupItem => 'items' in navItem && navItem.items.some((child) => child.id === (item as NavItem).id));
    if (parentGroup && parentGroup.segment) {
      return item.segment === secondSegment && parentGroup.segment === topSegment;
    }

    if (item.href === '/dashboard/content') {
      return item.segment === topSegment && pathname !== '/dashboard/content/new';
    }

    return item.segment === topSegment;
  }

  if ('href' in item) {
    return pathname === item.href;
  }

  return false;
}
