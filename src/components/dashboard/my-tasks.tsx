"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TasksSkeleton } from './dashboard-skeleton';
import { Task } from '@/types/task';
import { formatDistanceToNow } from 'date-fns';
import { BrandDisplay } from '@/components/ui/brand-display';

async function fetchTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/me/tasks');
    if (!response.ok) {
      console.error('Failed to fetch tasks');
      return [];
    }
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      const fetchedTasks = await fetchTasks();
      setTasks(fetchedTasks);
      setIsLoading(false);
    };
    loadTasks();
  }, []);

  if (isLoading) {
    return <TasksSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks</CardTitle>
        <CardDescription>
          Items assigned to you that require action.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks && tasks.length > 0 ? (
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                   <BrandDisplay 
                     brand={{
                       name: task.brand_name || 'Unknown Brand',
                       brand_color: task.brand_color,
                       logo_url: task.brand_logo_url
                     }}
                     variant="compact"
                     size="md"
                   />
                   <div>
                    <Link href={`/dashboard/content/${task.content_id}`} className="font-semibold hover:underline">
                      {task.content_title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      <Badge 
                        variant="outline" 
                        style={task.brand_color ? { borderColor: task.brand_color, color: task.brand_color } : {}}
                        className="mr-2 -translate-y-px"
                      >
                        {task.brand_name || 'No Brand'}
                      </Badge>
                       <span>› {task.workflow_step_name}</span>
                       <span className="mx-1">·</span>
                       <time>
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                       </time>
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/content/${task.content_id}/edit`} className="text-sm hover:underline flex-shrink-0">View</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>You have no pending tasks.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
