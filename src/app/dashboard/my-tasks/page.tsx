'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Eye, Edit, AlertCircle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

// Updated TaskItem interface to match the new API response from /api/me/tasks
interface TaskItem {
  id: string; // This is user_tasks.id
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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/me/tasks');
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        if (data.success) {
          setTasks(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to process tasks data');
        }
      } catch (err: any) {
        console.error('Error fetching tasks:', err);
        setError(err.message || 'Failed to load tasks');
        toast.error("Failed to load your tasks. Please try again.", {
          description: err.message || "Unknown error", // Provide fallback for description
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // getStepName function is no longer needed as workflow_step_name is directly available.

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
            <CardTitle>Pending Your Action</CardTitle> {/* Updated Title */}
            <CardDescription>{tasks.length} item(s) requiring your attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Content Title</th>
                    {/* <th className="text-left p-3 font-medium">Template</th> */}{/* Template removed for now */}
                    <th className="text-left p-3 font-medium">Brand</th>
                    <th className="text-left p-3 font-medium">Workflow Step</th>
                    <th className="text-left p-3 font-medium">Task Status</th>
                    <th className="text-left p-3 font-medium">Due Date</th>
                    {/* <th className="text-left p-3 font-medium">Last Updated</th> */}{/* Replaced by Due Date or Task Creation */}
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{task.content_title || 'N/A'}</td>
                      {/* <td className="p-3">{task.template_name || 'N/A'}</td> */}{/* Template removed for now */}
                      <td className="p-3">{task.brand_name || 'N/A'}</td>
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
                      {/* <td className="p-3 text-muted-foreground">{formatDate(task.created_at)}</td> */}
                      <td className="p-3">
                        <Button variant="outline" size="sm" asChild>
                          {/* Ensure task.content_id is used for the link if task.id is user_task.id */}
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