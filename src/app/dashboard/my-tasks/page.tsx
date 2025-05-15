'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Eye, Edit, AlertCircle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client'; // Corrected import
import { format as formatDateFns } from 'date-fns'; // Added for date formatting
import { BrandIcon } from '@/components/brand-icon'; // Added for Brand Avatars

// Interface for the data structure from /api/content
interface ContentItemFromApi {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  brand_id: string | null;
  brand_name: string | null;
  brand_color: string | null;
  content_type_id: string | null;
  content_type_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  creator_avatar_url: string | null;
  template_id: string | null;
  template_name: string | null;
  template_icon: string | null;
  workflow_id: string | null;
  current_step_id: string | null; 
  current_step_name: string | null;
  assigned_to_id: string | null; // First assignee ID, from /api/content
  assigned_to_name: string | null; // Comma-separated names, from /api/content
  assigned_to?: string[] | null; // Actual array of assignee UUIDs
  workflow?: { // Workflow object from /api/content
    id: string;
    name: string;
    steps: Array<{
      id: string;
      name: string;
      description?: string;
      step_order: number;
      role?: string;
      approval_required?: boolean;
      assigned_user_ids?: string[];
    }>;
  };
  workflow_step_order?: number | null;
  brand_avatar_url?: string | null; // For BrandIcon
}

// TaskItem interface for the page
interface TaskItem {
  id: string; // Using content_id as the task unique key
  task_status: string | null;
  due_date: string | null;
  created_at: string | null;
  content_id: string | null;
  content_title: string | null;
  content_status: string | null;
  brand_id?: string | null;
  brand_name: string | null;
  brand_color?: string | null;
  workflow_id?: string | null;
  workflow_name?: string | null;
  workflow_step_id?: string | null;
  workflow_step_name: string | null;
  workflow_step_order?: number | null;
}

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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function initializePage() {
      setIsLoading(true);
      setError(null);
      const supabase = createSupabaseClient(); // Corrected function call
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user or user not logged in:', userError);
        setError('You must be logged in to view your tasks.');
        toast.error('Authentication Error', { description: 'Could not retrieve user information.' });
        setIsLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      try {
        const response = await fetch('/api/content'); // Fetch from /api/content
        if (!response.ok) {
          throw new Error('Failed to fetch content data');
        }
        const apiData = await response.json();
        if (apiData.success && Array.isArray(apiData.data)) {
          const allContentItems: ContentItemFromApi[] = apiData.data;
          
          const filteredAndMappedTasks = allContentItems
            .filter(item => 
              (item.status === 'pending_review' || item.status === 'rejected' || item.status === 'draft') &&
              item.assigned_to && Array.isArray(item.assigned_to) && item.assigned_to.includes(user.id)
            )
            .map((item): TaskItem => ({
              id: item.id, // Use content_id as task key
              task_status: item.status === 'pending_review' ? 'pending' : item.status,
              due_date: null, // Not available from /api/content
              created_at: item.created_at,
              content_id: item.id,
              content_title: item.title,
              content_status: item.status,
              brand_id: item.brand_id,
              brand_name: item.brand_name || 'N/A',
              brand_color: item.brand_color,
              workflow_id: item.workflow_id,
              workflow_name: item.workflow?.name || 'N/A',
              workflow_step_id: item.current_step_id,
              workflow_step_name: item.current_step_name || 'N/A',
              workflow_step_order: item.workflow?.steps?.find(s => s.id === item.current_step_id)?.step_order || undefined,
            }));
          setTasks(filteredAndMappedTasks);
        } else {
          throw new Error(apiData.error || 'Failed to process content data');
        }
      } catch (err: any) {
        console.error('Error fetching or processing tasks:', err);
        setError(err.message || 'Failed to load tasks');
        toast.error("Failed to load your tasks. Please try again.", {
          description: err.message || "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    initializePage();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    // Standard 4.6: Use dd MMMM yyyy or dd Mmmm for dates.
    // Since Due Date might be time-sensitive, keeping HH:mm might be acceptable if specified, but for consistency with other date displays, let's use dd MMMM yyyy for now.
    // If time is critical, a separate column or different formatting rule should apply.
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy'); 
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Content items awaiting your action</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ListChecks className="mx-auto h-16 w-16 text-primary/70 mb-6" />
            <h3 className="text-xl font-semibold">All caught up!</h3>
            <p className="text-muted-foreground mt-2">You have no pending tasks assigned to you.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Action</CardTitle>
            <CardDescription>{tasks.length} item(s) requiring your attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Content Title</th>
                    <th className="text-left p-3 font-medium">Brand</th>
                    <th className="text-left p-3 font-medium">Workflow Step</th>
                    <th className="text-left p-3 font-medium">Task Status</th>
                    <th className="text-left p-3 font-medium">Due Date</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{task.content_title || 'N/A'}</td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <BrandIcon name={task.brand_name || ''} color={task.brand_color ?? undefined} size="sm" className="mr-2" />
                          {task.brand_name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{task.workflow_step_name || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                          ${task.task_status === 'completed' ? 'bg-green-100 text-green-800' : 
                            task.task_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {task.task_status ? task.task_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(task.due_date)}</td>
                      <td className="p-3">
                        <Button variant="outline" size="sm" asChild title="Review this content item">
                          <Link href={`/dashboard/content/${task.content_id}`}>
                            <Eye className="h-4 w-4 mr-1.5" /> Review Content
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