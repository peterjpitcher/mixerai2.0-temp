'use client'; // Make it a client component to fetch data

import { useState, useEffect } from 'react';
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/card";
import Link from "next/link";
import { ListChecks, Package, Users, GitBranch, AlertTriangle, CheckCircle2, Clock, FileText, BarChart3, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { BrandIcon } from '@/components/brand-icon';

// Interface for workflow step (simplified, based on what's needed for display)
interface WorkflowStepInfo {
  id: number | string; // Step ID can be number or string from JSON
  name: string;
  // Add other properties if needed from the actual step structure
}

// Interface for a task item, ensuring workflow includes steps array
interface TaskItem {
  id: string; // This is the user_task.id
  task_status: string | null;
  due_date: string | null;
  created_at: string; // API provides this, ensure it's not null if used directly
  content_id: string;
  content_title: string;
  content_status: string; // This is content.status
  brand_id?: string | null;
  brand_name: string | null;
  brand_color?: string | null;
  workflow_id?: string | null;
  workflow_name: string | null;
  workflow_step_id?: string | null;
  workflow_step_name: string | null;
  workflow_step_order?: number | null;
}

// Interface for metrics
interface DashboardMetrics {
  totalBrands: number;
  totalContent: number;
  totalWorkflows: number;
  // Add more metrics as needed
}

/**
 * DashboardPage component.
 * Serves as the main landing page for authenticated users.
 * Displays an overview of key application sections like Content, Brands, Workflows, and Users,
 * along with quick action buttons for common tasks.
 */
export default function DashboardPage() {
  // await requireAuth(); // Auth is typically handled by middleware or layout for client components
  
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    // Fetch tasks
    const fetchTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const response = await fetch('/api/me/tasks');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTasks(data.data);
        } else {
          // It's good practice to log the actual error structure if it's not what's expected
          console.error('Failed to load tasks or data format incorrect:', data);
          toast.error(data.error || 'Failed to load your tasks.');
        }
      } catch (error) {
        toast.error('An error occurred while fetching tasks.');
      } finally {
        setIsLoadingTasks(false);
      }
    };

    // Fetch metrics
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const [brandsRes, contentRes, workflowsRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/content?status=active'),
          fetch('/api/workflows'),
        ]);

        const brandsData = await brandsRes.json();
        const contentData = await contentRes.json();
        const workflowsData = await workflowsRes.json();

        setMetrics({
          totalBrands: brandsData.success && Array.isArray(brandsData.data) ? brandsData.data.length : 0,
          totalContent: contentData.success && Array.isArray(contentData.data) ? contentData.data.length : 0,
          totalWorkflows: workflowsData.success && Array.isArray(workflowsData.data) ? workflowsData.data.length : 0,
        });

      } catch (error) {
        toast.error('An error occurred while fetching dashboard metrics.');
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchTasks();
    fetchMetrics();
  }, []);

  const getStatusIcon = (status: string | null) => { // Allow null for status
    switch (status) {
      case 'pending_review': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your workspace and tasks.
        </p>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.totalContent ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">items managed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Brands</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.totalBrands ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">brands configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.totalWorkflows ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">approval processes</p>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="h-5 w-5 mr-2" /> My Tasks</CardTitle>
          <CardDescription>Content items assigned to you that require your attention.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">You have no pending tasks. Great job!</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BrandIcon name={task.brand_name || 'Default'} color={task.brand_color ?? undefined} size="sm" />
                    {getStatusIcon(task.content_status)} {/* Use content_status for the icon */}
                    <div>
                      {/* Make sure content_id is available and correct for the link */}
                      <Link href={`/dashboard/content/${task.content_id}`} className="font-medium hover:underline">
                        {task.content_title || 'Untitled Task'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Brand: {task.brand_name || 'N/A'} | Workflow: {task.workflow_name || 'N/A'}
                        {task.workflow_step_name ?
                           ` - Step: ${task.workflow_step_name}`
                           : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    {/* Ensure created_at is a valid date string */}
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
    </div>
  );
} 