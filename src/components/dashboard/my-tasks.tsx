'use client';

import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/card";
import { ListChecks, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { BrandIcon } from '@/components/brand-icon';

interface TaskItem {
  id: string;
  task_status: string | null;
  created_at: string;
  content_id: string;
  content_title: string;
  content_status: string;
  brand_name: string | null;
  brand_color?: string | null;
  workflow_name: string | null;
  workflow_step_name: string | null;
}

interface MyTasksProps {
  tasks: TaskItem[];
}

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'pending_review': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default: return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

export function MyTasks({ tasks }: MyTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><ListChecks className="h-5 w-5 mr-2" /> My Tasks</CardTitle>
        <CardDescription>Content items assigned to you that require your attention.</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">You have no pending tasks. Great job!</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map(task => (
              <li key={task.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <BrandIcon name={task.brand_name || 'Default'} color={task.brand_color ?? undefined} size="sm" />
                  {getStatusIcon(task.content_status)}
                  <div>
                    <Link href={`/dashboard/content/${task.content_id}`} className="font-medium hover:underline">
                      {task.content_title || 'Untitled Task'}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Brand: {task.brand_name || 'N/A'} | Workflow: {task.workflow_name || 'N/A'}
                      {task.workflow_step_name ? ` - Step: ${task.workflow_step_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Assigned</p>
                  <p className="text-xs font-medium">{task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {tasks.length > 0 && (
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link href="/dashboard/my-tasks">View All My Tasks</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 