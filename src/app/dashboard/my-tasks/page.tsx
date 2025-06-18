'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit, AlertCircle, ListChecks, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import { format as formatDateFns } from 'date-fns';
import { BrandIcon } from '@/components/brand-icon';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // currentUserId is not strictly needed anymore if API handles user-specific tasks,
  // but keeping it doesn't harm and might be useful for other client-side checks if any.
  // const [currentUserId, setCurrentUserId] = useState<string | null>(null); 

  useEffect(() => {
    async function initializePage() {
      setIsLoading(true);
      setError(null);
      const supabase = createSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user or user not logged in:', userError);
        setError('You must be logged in to view your tasks.');
        toast.error('Authentication Error', { description: 'Could not retrieve user information.' });
        setIsLoading(false);
        return;
      }
      // setCurrentUserId(user.id);

      try {
        // Fetch tasks directly from the /api/me/tasks endpoint
        const response = await fetch('/api/me/tasks'); 
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch tasks' }));
          throw new Error(errorData.error || 'Failed to fetch tasks data');
        }
        const apiData = await response.json();
        if (apiData.success && Array.isArray(apiData.data)) {
          setTasks(apiData.data); // API now returns data in TaskItem format directly
        } else {
          throw new Error(apiData.error || 'Failed to process tasks data from API');
        }
      } catch (err) {
        console.error('Error fetching or processing tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
        toast.error("Failed to load your tasks. Please try again.", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    initializePage();
  }, []); // Dependency array is empty, runs once on mount

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'MMMM d, yyyy'); 
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        {/* Using Loader2 for consistency with other loading states */}
        <Loader2 className="h-12 w-12 text-primary animate-spin" /> 
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Failed to load tasks</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
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
          href="/dashboard/help?article=08-my-tasks" 
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
              href="/dashboard/help?article=08-my-tasks" 
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
            <CardDescription>{tasks.length} item(s) requiring your attention based on their current active status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="text-left p-3 font-medium">Content Title</th>
                    <th scope="col" className="text-left p-3 font-medium">Brand</th>
                    <th scope="col" className="text-left p-3 font-medium">Workflow Step</th>
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
                          <BrandIcon name={task.brand_name || ''} color={task.brand_color ?? undefined} logoUrl={task.brand_logo_url} size="sm" className="mr-2" />
                          {task.brand_name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{task.workflow_step_name || 'N/A'}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(task.created_at)}</td>
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