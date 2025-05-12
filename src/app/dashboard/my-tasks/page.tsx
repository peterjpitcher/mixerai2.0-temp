'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Eye, Edit, AlertCircle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

interface TaskItem {
  id: string;
  title: string;
  status: string; // e.g., pending_review
  current_step: number;
  updated_at: string;
  brand?: { name?: string; brand_color?: string };
  template?: { name?: string; icon?: string };
  workflow?: { id: string; name: string; steps: any[] }; 
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
          description: "Error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStepName = (task: TaskItem): string => {
    if (task.workflow && Array.isArray(task.workflow.steps) && task.workflow.steps[task.current_step]) {
      return task.workflow.steps[task.current_step].name || `Step ${task.current_step + 1}`;
    }
    return `Step ${task.current_step + 1}`;
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
            <CardTitle>Pending Your Review</CardTitle>
            <CardDescription>{tasks.length} item(s) requiring your attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Content Title</th>
                    <th className="text-left p-3 font-medium">Template</th>
                    <th className="text-left p-3 font-medium">Brand</th>
                    <th className="text-left p-3 font-medium">Current Step</th>
                    <th className="text-left p-3 font-medium">Last Updated</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{task.title}</td>
                      <td className="p-3">{task.template?.name || 'N/A'}</td>
                      <td className="p-3">{task.brand?.name || 'N/A'}</td>
                      <td className="p-3">{getStepName(task)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(task.updated_at)}</td>
                      <td className="p-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/content/${task.id}`}>
                            <Eye className="h-4 w-4 mr-1.5" /> Review
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