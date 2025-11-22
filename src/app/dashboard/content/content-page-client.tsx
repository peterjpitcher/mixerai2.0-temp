'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CreateContentDropdown } from '@/components/features/content/create-content-dropdown';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from "sonner";
import { formatDate } from '@/lib/utils/date';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchParams } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandDisplay } from '@/components/ui/brand-display';
import { FileText, AlertTriangle, RefreshCw, CheckCircle, XCircle, ListFilter, Archive, Trash2, HelpCircle, MoreVertical, Pencil, ShieldAlert } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { touchFriendly } from '@/lib/utils/touch-target';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DueDateIndicator } from '@/components/ui/due-date-indicator';
import { apiFetch } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-common-data';

// Define types
type ContentFilterStatus = 'active' | 'approved' | 'rejected' | 'all';

interface ContentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  brand_id: string;
  brand_name: string | null;
  brand_color?: string | null;
  brand_logo_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  creator_avatar_url?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  template_icon?: string | null;
  workflow_id?: string | null;
  current_step_id?: string | null;
  current_step_name?: string | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  assigned_to_avatar_url?: string | null; // Added for assignee avatar
  assigned_to?: string[] | null;
  due_date?: string | null;
}

type DueDateStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'completed' | 'rejected' | undefined;

const mapStatusToDueDateStatus = (status: string | undefined): DueDateStatus => {
  if (!status) return undefined;
  switch (status) {
    case 'draft':
      return 'draft';
    case 'pending_review':
    case 'under_review':
      return 'in_review';
    case 'approved':
      return 'approved';
    case 'published':
      return 'published';
    case 'cancelled':
      return 'completed';
    case 'rejected':
      return 'rejected';
    default:
      return undefined;
  }
};

const renderSkeletonRows = (count: number) =>
  Array.from({ length: count }).map((_, index) => (
    <tr key={`skeleton-${index}`} className="border-b">
      <td className="p-3">
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-muted animate-pulse rounded mt-2" />
      </td>
      <td className="p-3">
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </td>
      <td className="p-3">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-3">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </td>
      <td className="p-3 text-right">
        <div className="h-8 w-10 bg-muted animate-pulse rounded ml-auto" />
      </td>
    </tr>
  ));

// Define UserSessionData interface (mirroring what /api/me is expected to return)
// Placeholder Breadcrumbs component
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

export default function ContentPageClient() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState<ContentFilterStatus>('active');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState<ContentPagination>({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const searchParams = useSearchParams();
  const brandIdFromParams = searchParams?.get('brandId');
  const [activeBrandData, setActiveBrandData] = useState<{ id: string; name: string; brand_color?: string; logo_url?: string } | null>(null);
  const brandCacheRef = useRef<Map<string, { id: string; name: string; brand_color?: string; logo_url?: string }>>(new Map());
  const hasLoadedRef = useRef(false);
  const { data: currentUser } = useCurrentUser();

  // State for delete confirmation
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    async function fetchContentData() {
      const isFirstFetch = !hasLoadedRef.current;
      if (isFirstFetch) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      setPermissionError(null);
      try {
        let apiUrl = '/api/content';
        const params = new URLSearchParams();

        if (debouncedSearchQuery) {
          params.append('query', debouncedSearchQuery);
        }
        if (brandIdFromParams) {
          params.append('brandId', brandIdFromParams);
        }
        if (statusFilter) {
          params.append('status', statusFilter);
        }
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const queryString = params.toString();
        if (queryString) {
          apiUrl += `?${queryString}`;
        }

        const response = await apiFetch(apiUrl, { signal: abortController.signal });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            (payload && typeof payload === 'object' && 'error' in payload ? (payload as { error?: string }).error : null) ||
            'Failed to fetch content data from API';

          if (response.status === 403) {
            setPermissionError(message || 'You do not have permission to view this content.');
            setContent([]);
            if (isFirstFetch) {
              setIsLoading(false);
            } else {
              setIsRefreshing(false);
            }
            return;
          }

          throw new Error(message);
        }

        if (!payload || typeof payload !== 'object') {
          throw new Error('Unexpected response from content API');
        }

        if ('success' in payload && payload.success) {
          const items = Array.isArray(payload.data) ? payload.data : [];
          setPermissionError(null);
          setContent(items.map((item: unknown) => {
            const contentItem = item as Record<string, unknown>;
            return { ...contentItem, assigned_to: contentItem.assigned_to || null } as ContentItem;
          }));
          hasLoadedRef.current = true;
          setIsLoading(false);
          setIsRefreshing(false);
          if ('pagination' in payload && payload.pagination) {
            const paginationPayload = payload.pagination as Partial<ContentPagination>;
            setPagination({
              page: paginationPayload.page ?? page,
              limit: paginationPayload.limit ?? limit,
              total: paginationPayload.total ?? items.length,
              totalPages: paginationPayload.totalPages ?? 1,
              hasNextPage: Boolean(paginationPayload.hasNextPage),
              hasPreviousPage: Boolean(paginationPayload.hasPreviousPage),
            });
          } else {
            setPagination(prev => ({
              ...prev,
              page,
              limit,
              total: items.length,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: page > 1,
            }));
          }
        } else {
          setContent([]);
          const message = 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'API returned error fetching content';
          throw new Error(message);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Error in fetchContentData:', err);
        setError((err as Error).message || 'Failed to load content data');
        setContent([]);
        sonnerToast.error("Failed to load content", { description: (err as Error).message || "Please try again." });
        setIsLoading(false);
        setIsRefreshing(false);
      } finally {
        if (!abortController.signal.aborted) {
          if (isFirstFetch) {
            setIsLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      }
    }
    fetchContentData();
    return () => abortController.abort();
  }, [debouncedSearchQuery, brandIdFromParams, statusFilter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, brandIdFromParams, statusFilter]);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchActiveBrand = async () => {
      if (brandIdFromParams) {
        const cachedBrand = brandCacheRef.current.get(brandIdFromParams);
        if (cachedBrand) {
          setActiveBrandData(cachedBrand);
          return;
        }
        try {
          const res = await apiFetch(`/api/brands/${brandIdFromParams}`, { signal: abortController.signal });
          if (!res.ok) {
            throw new Error('Failed to fetch brand');
          }
          const data = await res.json();
          if (data.success && data.brand) {
            brandCacheRef.current.set(brandIdFromParams, data.brand);
            setActiveBrandData(data.brand);
          } else {
            setActiveBrandData(null);
            console.warn("Could not fetch active brand data for header");
          }
        } catch (err) {
          setActiveBrandData(null);
          console.warn("Error fetching active brand data:", err);
        }
      } else {
        setActiveBrandData(null);
      }
    };
    fetchActiveBrand();
    return () => abortController.abort();
  }, [brandIdFromParams]);

  const groupedContent = useMemo(() => {
    if (!content) return {};
    return content.reduce((acc, item) => {
      const brandName = item.brand_name || 'Unassigned Brand';
      if (!acc[brandName]) acc[brandName] = [];
      acc[brandName].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
  }, [content]);

  const paginationSummary = useMemo(() => {
    if (!content || content.length === 0) {
      return { start: 0, end: 0 };
    }
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.total, start + content.length - 1);
    return { start, end };
  }, [content, pagination.limit, pagination.page, pagination.total]);

  const isUserAssigned = (item: ContentItem, userId: string | undefined): boolean => {
    if (!userId || !item.assigned_to) return false;
    const currentUserIdStr = String(userId);
    if (Array.isArray(item.assigned_to)) {
      return item.assigned_to.map(String).includes(currentUserIdStr);
    }
    return String(item.assigned_to_id) === currentUserIdStr;
  };

  // Permission check for deleting content
  const canDeleteContent = (item: ContentItem): boolean => {
    if (!currentUser) return false;
    if (currentUser.user_metadata?.role === 'admin') {
      return true; // Global Admins can delete
    }
    if (currentUser.brand_permissions && item.brand_id) {
      const brandPerm = currentUser.brand_permissions.find(p => p.brand_id === item.brand_id);
      if (brandPerm && brandPerm.role === 'admin') {
        return true; // Brand Admins for this content's brand can delete
      }
    }
    return false;
  };

  const handleDeleteClick = (item: ContentItem) => {
    if (!canDeleteContent(item)) {
      sonnerToast.error("You don't have permission to delete this content item.");
      return;
    }
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !canDeleteContent(itemToDelete)) {
      sonnerToast.error("Deletion not allowed or item not specified.");
      setShowDeleteDialog(false);
      return;
    }
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/content/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        sonnerToast.success(`Content "${itemToDelete.title}" deleted successfully.`);
        setContent(prev => prev.filter(c => c.id !== itemToDelete.id));
        const newTotal = Math.max(0, pagination.total - 1);
        const newTotalPages = Math.max(1, Math.ceil(newTotal / pagination.limit));
        const adjustedPage = Math.min(page, newTotalPages);
        setPagination(prev => ({
          ...prev,
          total: newTotal,
          totalPages: newTotalPages,
          hasNextPage: adjustedPage < newTotalPages,
          hasPreviousPage: adjustedPage > 1,
          page: adjustedPage,
        }));
        if (adjustedPage !== page) {
          setPage(adjustedPage);
        }
      } else {
        sonnerToast.error(result.error || 'Failed to delete content.');
      }
    } catch (err: unknown) {
      sonnerToast.error('An error occurred during deletion: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const EmptyState = () => (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <FileText size={40} className="text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold mb-2">No content found</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        No content matches the current filters. Try adjusting your search or filter selection.
      </p>
      <div className="space-y-3">
        {statusFilter !== 'all' && (
          <Button variant="outline" onClick={() => setStatusFilter('all')}>
            <ListFilter size={16} className="mr-2" /> Show All Content
          </Button>
        )}
        <div>
          <Link
            href="/dashboard/help#content"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle className="h-4 w-4" />
            Learn how to create content
          </Link>
        </div>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle size={40} className="text-destructive" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold mb-2">Failed to load content</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error || "An error occurred while loading your content. Please try again."}</p>
      <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
        <RefreshCw size={16} className="mr-2" /> Retry
      </Button>
    </div>
  );

  const ForbiddenState = () => (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <ShieldAlert size={40} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold mb-2">You do not have access</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {permissionError || "Your current role does not allow viewing content for this brand. Choose a different brand or contact an administrator for access."}
      </p>
      <div className="flex justify-center">
        <Button variant="outline" size="lg" asChild>
          <Link href="/dashboard/content">
            <ListFilter size={16} className="mr-2" /> View All Content
          </Link>
        </Button>
      </div>
    </div>
  );

  const filterOptions: { label: string; value: ContentFilterStatus; icon?: React.ElementType }[] = [
    { label: 'Active', value: 'active', icon: ListFilter },
    { label: 'Approved', value: 'approved', icon: CheckCircle },
    { label: 'Rejected', value: 'rejected', icon: XCircle },
    { label: 'All', value: 'all', icon: Archive },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        ...(brandIdFromParams && activeBrandData ?
          [
            { label: "Brands", href: "/dashboard/brands" },
            { label: activeBrandData.name || "Brand", href: `/dashboard/brands/${brandIdFromParams}` },
            { label: "Content" }
          ] :
          [{ label: "Content" }])
      ]} />

      <PageHeader
        title={brandIdFromParams && activeBrandData ? `Content for ${activeBrandData.name}` : "All Content"}
        description="View, manage, and track all content items across your brands."
        actions={<CreateContentDropdown />}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="max-w-sm w-full sm:w-auto"><Input placeholder="Search content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <div className="flex items-center space-x-2">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              className="flex items-center"
            >
              {option.icon && <option.icon className="mr-2 h-4 w-4" />}
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {!isLoading && !permissionError && !error && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            Showing {paginationSummary.start}-{paginationSummary.end} of {pagination.total} content item{pagination.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={!pagination.hasPreviousPage || isLoading || isRefreshing}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => prev + 1)}
              disabled={!pagination.hasNextPage || isLoading || isRefreshing}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : permissionError ? (
        <ForbiddenState />
      ) : error ? (
        <ErrorState />
      ) : Object.keys(groupedContent).length === 0 ? (
        <EmptyState />
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(groupedContent)} className="w-full space-y-4">
          {Object.entries(groupedContent).map(([brandName, items]) => (
            <AccordionItem value={brandName} key={brandName} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="bg-muted hover:bg-muted/90 px-4 py-3">
                <div className="flex items-center">
                  {items.length > 0 &&
                    <BrandDisplay
                      brand={{
                        name: brandName,
                        brand_color: items[0].brand_color,
                        logo_url: items[0].brand_logo_url
                      }}
                      variant="compact"
                      size="sm"
                      className="mr-2"
                    />}
                  <span className="font-semibold text-lg">{brandName} ({items.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr className="border-b">
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Current Step</th>
                      <th className="text-left p-3 font-medium">Assigned To</th>
                      <th className="text-left p-3 font-medium">Created By</th>
                      <th className="text-left p-3 font-medium">Due Date</th>
                      <th className="text-left p-3 font-medium">Last Updated</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {isRefreshing ? renderSkeletonRows(Math.max(items.length || 0, 3)) : items.map((item) => {
                        const userIsAssigned = currentUser ? isUserAssigned(item, currentUser.id) : false;
                        const userCanDelete = canDeleteContent(item);
                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-3">
                              <Link href={`/dashboard/content/${item.id}`} className="font-medium hover:underline text-primary">
                                {item.title || 'Untitled Content'}
                              </Link>
                              {item.template_name && <p className="text-xs text-muted-foreground flex items-center mt-1">
                                {item.template_icon && <FileText className="mr-1 h-3 w-3 text-muted-foreground" />}
                                {item.template_name}
                              </p>}
                            </td>
                            <td className="p-3">{item.current_step_name || 'N/A'}</td>
                            <td className="p-3">
                              {item.assigned_to_name ? (
                                <div className="flex items-center">
                                  <div className="relative h-6 w-6 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2">
                                    {item.assigned_to_avatar_url ? (
                                      <Image
                                        src={item.assigned_to_avatar_url}
                                        alt={item.assigned_to_name}
                                        fill
                                        className="object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                      />
                                    ) : null}
                                    <div className={`flex items-center justify-center h-full w-full text-xs font-semibold text-primary bg-muted-foreground/20 ${item.assigned_to_avatar_url ? 'hidden' : ''}`}>
                                      {(item.assigned_to_name || 'A').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <span className="truncate" title={item.assigned_to_name}>{item.assigned_to_name}</span>
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="p-3">
                              {item.created_by_name ? (
                                <div className="flex items-center">
                                  <div className="relative h-6 w-6 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2">
                                    {item.creator_avatar_url ? (
                                      <Image
                                        src={item.creator_avatar_url}
                                        alt={item.created_by_name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : null}
                                    <div className={`flex items-center justify-center h-full w-full text-xs font-semibold text-primary bg-muted-foreground/20 ${item.creator_avatar_url ? 'hidden' : ''}`}>
                                      {(item.created_by_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <span className="truncate" title={item.created_by_name}>{item.created_by_name}</span>
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <DueDateIndicator
                                dueDate={item.due_date || null}
                                status={mapStatusToDueDateStatus(item.status)}
                                size="sm"
                              />
                              {!item.due_date && <span className="text-muted-foreground">N/A</span>}
                            </td>
                            <td className="p-3 whitespace-nowrap">{formatDate(item.updated_at)}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                {userIsAssigned && !userCanDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={touchFriendly('tableAction')}
                                    asChild
                                  >
                                    <Link href={`/dashboard/content/${item.id}/edit`}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </Link>
                                  </Button>
                                )}
                                {userCanDelete && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className={touchFriendly('tableAction')}>
                                        <span className="sr-only">Open menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {userIsAssigned && (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/dashboard/content/${item.id}/edit`}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                          </Link>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteClick(item)}
                                        className="text-destructive"
                                        disabled={isDeleting && itemToDelete?.id === item.id}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {isDeleting && itemToDelete?.id === item.id ? 'Deleting...' : 'Delete'}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Delete Confirmation Dialog */}
      {itemToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content: &quot;{itemToDelete.title}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this content item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
