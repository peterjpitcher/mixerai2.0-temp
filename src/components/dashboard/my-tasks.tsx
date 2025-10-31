"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TasksSkeleton } from './dashboard-skeleton';
import { Task } from '@/types/task';
import { formatDistanceToNow } from 'date-fns';
import { BrandDisplay } from '@/components/ui/brand-display';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/observability/logger';

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError';
};

const logger = createLogger('dashboard:my-tasks');

export function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadTasks = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetchJson<{ success: boolean; data?: Task[]; error?: string }>(
        '/api/me/tasks',
        {
          signal,
          errorMessage: 'Unable to load tasks right now.',
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Unable to load tasks.');
      }

      if (!signal.aborted) {
        setTasks(response.data ?? []);
      }
    } catch (err) {
      if (isAbortError(err) || signal.aborted) {
        return;
      }

      logger.error('Failed to fetch dashboard tasks', { error: err });
      const message = err instanceof ApiClientError ? err.message : 'Unable to load tasks right now.';
      setTasks([]);
      setError(message);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadTasks, reloadKey]);

  const handleRetry = () => {
    setReloadKey((value) => value + 1);
  };

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
        {error ? (
          <div className="text-center space-y-3 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={handleRetry} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        ) : tasks && tasks.length > 0 ? (
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
