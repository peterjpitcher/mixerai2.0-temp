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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  // currentUserId is not strictly needed anymore if API handles user-specific tasks,
  // but keeping it doesn't harm and might be useful for other client-side checks if any.
  // const [currentUserId, setCurrentUserId] = useState<string | null>(null); 

  useEffect(() => {
    const abortController = new AbortController();

    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      setAuthError(false);
      setPagination(null);

      try {
        const response = await fetch('/api/me/tasks', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        if (response.status === 401) {
          const message = 'Your session has expired. Please sign in again to view your tasks.';
          setAuthError(true);
          setError(message);
          setTasks([]);
          toast.error('Authentication required', { description: message });
          return;
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error('Failed to parse tasks response.');
        }

        const data = payload as { success?: boolean; data?: unknown; error?: string };

        if (!response.ok || !data.success || !Array.isArray(data.data)) {
          throw new Error(data.error || 'Failed to fetch tasks data');
        }

        const paginationMeta = (data as typeof data & { pagination?: PaginationMeta }).pagination;
        if (paginationMeta && typeof paginationMeta.page === 'number') {
          setPagination(paginationMeta);
        }

        setTasks((data.data as TaskItem[]).map(task => ({
          ...task,
          content_title: task.content_title ?? 'Untitled Content',
          brand_name: task.brand_name ?? 'N/A',
          workflow_step_name: task.workflow_step_name ?? 'N/A',
        })));
      } catch (err) {
        if (abortController.signal.aborted) return;

        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        setError(message);
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
  }, [reloadKey]);

  const handleRetry = () => {
    setReloadKey((previous) => previous + 1);
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
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Failed to load tasks</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        {authError ? (
          <Button asChild>
            <Link href="/auth/login?redirect=/dashboard/my-tasks">
              Sign in
            </Link>
          </Button>
        ) : (
          <Button onClick={handleRetry} variant="outline">Retry</Button>
        )}
      </div>
    );
  }

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

      {tasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ListChecks className="mx-auto h-16 w-16 text-primary/70 mb-6" />
            <h3 className="text-xl font-semibold">All caught up!</h3>
            <p className="text-muted-foreground mt-2">You have no pending tasks assigned to you.</p>
            <Link 
              href="/dashboard/help#my-tasks" 
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              Learn about tasks →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Action</CardTitle>
            <CardDescription>
              Showing {tasks.length} item{tasks.length === 1 ? '' : 's'}
              {pagination?.total ? ` out of ${pagination.total}` : ''} requiring your attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                          status={task.content_status === 'rejected' ? 'in_review' : (task.content_status === 'under_review' ? 'in_review' : task.content_status) as 'draft' | 'approved' | 'published' | 'in_review' | 'completed' | undefined}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
