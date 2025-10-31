'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit, AlertCircle, ListChecks, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/date';
import { BrandIcon } from '@/components/brand-icon';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { DueDateIndicator } from '@/components/ui/due-date-indicator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { mapContentStatusToDueDateStatus } from './utils';

// TaskItem interface for the page - this should match the output of /api/me/tasks
interface TaskItem {
  id: string; // This is content.id, used as unique key for task list item
  task_status: string | null; // Derived from content.status on API, e.g., 'pending' or 'draft'
  due_date: string | null; // API currently returns null for this
  created_at: string | null; // content.created_at
  content_id: string; // content.id
  content_title: string | null;
  content_status: string | null; // content.status
  brand_id?: string | null;
  brand_name: string | null;
  brand_color?: string | null;
  brand_logo_url?: string | null;
  workflow_id?: string | null;
  workflow_name: string | null;
  workflow_step_id?: string | null;
  workflow_step_name: string | null;
  workflow_step_order?: number | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface BrandOption {
  id: string;
  name: string;
  color?: string | null;
}

const PAGE_SIZE = 10;

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [availableBrands, setAvailableBrands] = useState<BrandOption[]>([]);
  // currentUserId is not strictly needed anymore if API handles user-specific tasks,
  // but keeping it doesn't harm and might be useful for other client-side checks if any.
  // const [currentUserId, setCurrentUserId] = useState<string | null>(null); 

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrandId, debouncedSearchQuery]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      setAuthError(false);
      setPermissionError(null);
      setErrorCode(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });

      if (selectedBrandId !== 'all') {
        params.append('brandId', selectedBrandId);
      }

      if (debouncedSearchQuery) {
        params.set('search', debouncedSearchQuery);
      }

      try {
        const response = await fetch(`/api/me/tasks?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error('Failed to parse tasks response.');
        }

        const data = payload as { success?: boolean; data?: unknown; error?: string; pagination?: PaginationMeta };

        if (response.status === 401) {
          const message = 'Your session has expired. Please sign in again to view your tasks.';
          setAuthError(true);
          setError(message);
          setTasks([]);
          toast.error('Authentication required', { description: message });
          return;
        }

        if (response.status === 403) {
          const message = data.error || 'You do not have permission to view these tasks.';
          setPermissionError(message);
          setError(message);
          setTasks([]);
          setPagination(null);
          setErrorCode((data as { code?: string }).code ?? null);
          toast.error('Permission required', { description: message });
          return;
        }

        if (!response.ok || !data.success || !Array.isArray(data.data)) {
          throw new Error(data.error || 'Failed to fetch tasks data');
        }

        const paginationMeta = data.pagination;
        if (paginationMeta && typeof paginationMeta.page === 'number') {
          setPagination(paginationMeta);
        } else {
          setPagination(null);
        }

        const normalizedTasks = (data.data as TaskItem[]).map((task) => ({
          ...task,
          content_title: task.content_title ?? 'Untitled Content',
          brand_name: task.brand_name ?? 'N/A',
          workflow_step_name: task.workflow_step_name ?? 'N/A',
        }));

        setTasks(normalizedTasks);
        setErrorCode(null);
        setAvailableBrands((previous) => {
          const brandMap = new Map(previous.map((brand) => [brand.id, brand]));
          normalizedTasks.forEach((task) => {
            if (task.brand_id) {
              brandMap.set(task.brand_id, {
                id: task.brand_id,
                name: task.brand_name ?? 'Unknown Brand',
                color: task.brand_color ?? null,
              });
            }
          });
          return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        });
      } catch (err) {
        if (abortController.signal.aborted) return;

        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        setError(message);
        setErrorCode(null);
        setTasks([]);
        setPagination(null);
        toast.error('Failed to load your tasks. Please try again.', {
          description: message,
        });
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTasks();

    return () => {
      abortController.abort();
    };
  }, [currentPage, debouncedSearchQuery, selectedBrandId, reloadKey]);

  const handleRetry = () => {
    setReloadKey((previous) => previous + 1);
  };

  const handleClearFilters = () => {
    setSelectedBrandId('all');
    setSearchQuery('');
    setCurrentPage(1);
    setReloadKey((previous) => previous + 1);
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage((previous) => previous + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.hasPreviousPage && currentPage > 1) {
      setCurrentPage((previous) => Math.max(1, previous - 1));
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Tasks" }]} />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground">Content items assigned to you that are currently active and require your action.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Action</CardTitle>
            <CardDescription>Loading your assigned tasks...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <TableSkeleton rows={3} columns={5} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorTitle = permissionError ? 'Access required' : 'Failed to load tasks';
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">{errorTitle}</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        {authError ? (
          <Button asChild>
            <Link href="/auth/login?redirect=/dashboard/my-tasks">
              Sign in
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {permissionError && errorCode === 'BRAND_FILTER_FORBIDDEN' ? (
              <Button onClick={handleClearFilters} variant="outline">
                Clear filters
              </Button>
            ) : null}
            <Button onClick={handleRetry} variant="outline">
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  const hasFilters = selectedBrandId !== 'all' || searchQuery.trim().length > 0;
  const totalItems = pagination?.total ?? tasks.length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Tasks" }]} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">Content items assigned to you that are currently active and require your action.</p>
        </div>
        <Link
          href="/dashboard/help#my-tasks"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need help?
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Your Action</CardTitle>
          <CardDescription>
            {totalItems > 0
              ? `Showing ${tasks.length} of ${totalItems} item${totalItems === 1 ? '' : 's'}${pagination ? ` (page ${pagination.page}${pagination.totalPages ? ` of ${pagination.totalPages}` : ''})` : ''}.`
              : 'Review and complete the content that needs your attention.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 pb-6 md:flex-row md:items-center md:justify-between">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by content title"
              className="md:max-w-sm"
            />
            <div className="flex items-center gap-3">
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters ? (
                <Button onClick={handleClearFilters} size="sm" variant="ghost">
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground">
              {hasFilters ? (
                <>
                  <AlertCircle className="h-12 w-12 text-primary/70" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">No tasks match your filters</h3>
                    <p>Adjust your search or clear filters to see more tasks.</p>
                  </div>
                </>
              ) : (
                <>
                  <ListChecks className="h-16 w-16 text-primary/70" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                    <p>You have no pending tasks assigned to you.</p>
                  </div>
                  <Link
                    href="/dashboard/help#my-tasks"
                    className="text-sm text-primary hover:underline"
                  >
                    Learn about tasks →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="text-left p-3 font-medium">Content Title</th>
                    <th scope="col" className="text-left p-3 font-medium">Brand</th>
                    <th scope="col" className="text-left p-3 font-medium">Workflow Step</th>
                    <th scope="col" className="text-left p-3 font-medium">Due Date</th>
                    <th scope="col" className="text-left p-3 font-medium">Assigned On</th>
                    <th scope="col" className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        <Link href={`/dashboard/content/${task.content_id}/edit`} className="hover:underline">
                            {task.content_title || 'Untitled Content'}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <BrandIcon name={task.brand_name || ''} color={task.brand_color ?? undefined} logoUrl={task.brand_logo_url || undefined} size="sm" className="mr-2" />
                          {task.brand_name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{task.workflow_step_name || 'N/A'}</td>
                      <td className="p-3">
                        <DueDateIndicator 
                          dueDate={task.due_date} 
                          status={mapContentStatusToDueDateStatus(task.content_status)}
                          size="sm"
                        />
                        {!task.due_date && <span className="text-muted-foreground">N/A</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">{task.created_at ? formatDate(task.created_at) : 'N/A'}</td>
                      <td className="p-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/content/${task.content_id}/edit`} className="flex items-center">
                                <Edit className="mr-1 h-3.5 w-3.5" /> Edit Content
                            </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination ? (
            <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page}{pagination.totalPages ? ` of ${Math.max(pagination.totalPages, 1)}` : ''}{totalItems > 0 ? ` • ${totalItems} total` : ''}
              </p>
              <div className="flex items-center gap-2 sm:justify-end">
                <Button
                  onClick={handlePreviousPage}
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
