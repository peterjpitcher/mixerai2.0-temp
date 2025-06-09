import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { MyTasks } from '@/components/dashboard/my-tasks';
import { MetricsSkeleton, TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';

async function getDashboardMetrics(supabase: any) {
  // This is inefficient and should be fixed per issue #9
  const { data: brands, error: brandsError } = await supabase.from('brands').select('id');
  const { data: content, error: contentError } = await supabase.from('content').select('id', { head: true });
  const { data: workflows, error: workflowsError } = await supabase.from('workflows').select('id');

  return {
    totalBrands: brands?.length ?? 0,
    totalContent: content?.length ?? 0,
    totalWorkflows: workflows?.length ?? 0,
  };
}

async function getMyTasks(supabase: any) {
  const { data, error } = await supabase.rpc('get_user_tasks');
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data;
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const metrics = getDashboardMetrics(supabase);
  const tasks = getMyTasks(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your workspace and tasks.
        </p>
      </div>

      <Suspense fallback={<MetricsSkeleton />}>
        <DashboardMetricsWrapper metricsPromise={metrics} />
      </Suspense>

      <Suspense fallback={<TasksSkeleton />}>
        <MyTasksWrapper tasksPromise={tasks} />
      </Suspense>
    </div>
  );
}

async function DashboardMetricsWrapper({ metricsPromise }: { metricsPromise: Promise<any> }) {
  const metrics = await metricsPromise;
  return <DashboardMetrics metrics={metrics} />;
}

async function MyTasksWrapper({ tasksPromise }: { tasksPromise: Promise<any[]> }) {
  const tasks = await tasksPromise;
  return <MyTasks tasks={tasks} />;
} 