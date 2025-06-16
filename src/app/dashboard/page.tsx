import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { MyTasks } from '@/components/dashboard/my-tasks';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { JumpBackIn } from '@/components/dashboard/jump-back-in';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, FileText, GitBranch, Shield, BarChart3, Clock, CheckCircle2 } from 'lucide-react';

async function getTeamActivity(supabase: ReturnType<typeof createSupabaseServerClient>, profile: { id?: string; role?: string; assigned_brands?: string[]; full_name?: string } | null) {
  if (!profile) return [];

  let query = supabase
    .from('content')
    .select(`
      id,
      created_at,
      title,
      status,
      created_by,
      brand_id,
      profiles ( id, full_name, avatar_url )
    `);

  if (profile.role !== 'admin') {
    if (!profile.assigned_brands || profile.assigned_brands.length === 0) return [];
    query = query.in('brand_id', profile.assigned_brands);
  }
    
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching team activity:', error);
    return [];
  }

  return data.map(item => ({
    id: item.id,
    type: item.status === 'draft' ? 'content_created' as const : 'content_updated' as const,
    created_at: item.created_at || new Date().toISOString(),
    user: item.profiles,
    target: {
      id: item.id,
      name: item.title,
      type: 'content' as const,
    },
  }));
}

async function getMostAgedContent(supabase: ReturnType<typeof createSupabaseServerClient>, profile: { id?: string; role?: string; assigned_brands?: string[]; full_name?: string } | null) {
  if (!profile) return [];

  let query = supabase
    .from('content')
    .select('id, title, updated_at, status, brand_id, brands ( name, brand_color )')
    .in('status', ['draft', 'pending_review']);

  if (profile.role !== 'admin') {
    if (!profile.assigned_brands || profile.assigned_brands.length === 0) return [];
    query = query.in('brand_id', profile.assigned_brands);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error fetching most aged content:', error);
    return [];
  }

  return data
    .filter(item => item.updated_at !== null)
    .map((item) => ({
      ...item,
      updated_at: item.updated_at!,
      brandName: item.brands?.name || 'N/A',
      brandColor: item.brands?.brand_color || '#888'
    }));
}

async function getDashboardMetrics(supabase: ReturnType<typeof createSupabaseServerClient>, profile: { id?: string; role?: string; assigned_brands?: string[]; full_name?: string } | null) {
  if (!profile) return { totalContent: 0, totalBrands: 0, totalWorkflows: 0, pendingTasks: 0, completedThisWeek: 0, pendingReviews: 0 };

  try {
    // Base queries
    let contentQuery = supabase.from('content').select('id, status', { count: 'exact' });
    let brandsQuery = supabase.from('brands').select('id', { count: 'exact' });
    let workflowsQuery = supabase.from('workflows').select('id', { count: 'exact' });

    // Apply brand filtering for non-admins
    if (profile.role !== 'admin') {
      if (!profile.assigned_brands || profile.assigned_brands.length === 0) {
        return { totalContent: 0, totalBrands: 0, totalWorkflows: 0, pendingTasks: 0, completedThisWeek: 0, pendingReviews: 0 };
      }
      contentQuery = contentQuery.in('brand_id', profile.assigned_brands);
      brandsQuery = brandsQuery.in('id', profile.assigned_brands);
      workflowsQuery = workflowsQuery.in('brand_id', profile.assigned_brands);
    }

    const [contentResult, brandsResult, workflowsResult] = await Promise.all([
      contentQuery,
      brandsQuery,
      workflowsQuery
    ]);

    // Count pending reviews
    const pendingReviews = contentResult.data?.filter(c => c.status === 'pending_review').length || 0;

    // Get pending tasks count
    const { count: pendingTasksCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', profile.id || '')
      .eq('status', 'pending');

    // Get completed tasks this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: completedThisWeekCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', profile.id || '')
      .eq('status', 'completed')
      .gte('updated_at', weekAgo.toISOString());

    return {
      totalContent: contentResult.count || 0,
      totalBrands: brandsResult.count || 0,
      totalWorkflows: workflowsResult.count || 0,
      pendingTasks: pendingTasksCount || 0,
      completedThisWeek: completedThisWeekCount || 0,
      pendingReviews
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return { totalContent: 0, totalBrands: 0, totalWorkflows: 0, pendingTasks: 0, completedThisWeek: 0, pendingReviews: 0 };
  }
}

async function getRecentItems(supabase: ReturnType<typeof createSupabaseServerClient>, profile: { id?: string; role?: string; assigned_brands?: string[]; full_name?: string } | null) {
  if (!profile || !profile.id) return [];

  let query = supabase
    .from('content')
    .select('id, title, updated_at, brands ( name )')
    .eq('created_by', profile.id)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (profile.role !== 'admin' && profile.assigned_brands && profile.assigned_brands.length > 0) {
    query = query.in('brand_id', profile.assigned_brands);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent items:', error);
    return [];
  }

  return data || [];
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const profile = await getProfileWithAssignedBrands(supabase);
  
  // Fetch data in parallel
  const [
    teamActivity,
    mostAgedContent,
    metrics,
    recentItems
  ] = await Promise.all([
    getTeamActivity(supabase, profile),
    getMostAgedContent(supabase, profile),
    getDashboardMetrics(supabase, profile),
    getRecentItems(supabase, profile)
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header with welcome message and quick actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your content today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/content/new">
              <Plus className="mr-2 h-4 w-4" /> Create Content
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/workflows/new">
              <GitBranch className="mr-2 h-4 w-4" /> New Workflow
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/claims/pending-approval">
              <Shield className="mr-2 h-4 w-4" /> Review Claims
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Content"
          value={metrics.totalContent}
          icon={FileText}
          description="across all brands"
        />
        <StatCard
          title="Pending Tasks"
          value={metrics.pendingTasks}
          icon={Clock}
          description="awaiting your action"
        />
        <StatCard
          title="Completed This Week"
          value={metrics.completedThisWeek}
          icon={CheckCircle2}
          description="tasks completed"
        />
        <StatCard
          title="In Review"
          value={metrics.pendingReviews}
          icon={BarChart3}
          description="content items"
        />
      </div>

      {/* Jump Back In Section */}
      {recentItems.length > 0 && (
        <div>
          <Suspense fallback={<TasksSkeleton />}>
            <JumpBackIn items={recentItems} />
          </Suspense>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<TasksSkeleton />}>
            <TeamActivityFeed initialActivity={teamActivity} />
          </Suspense>
        </div>
        
        {/* Right Sidebar - 1 column */}
        <div className="space-y-6">
          <Suspense fallback={<TasksSkeleton />}>
            <MyTasks />
          </Suspense>
          <Suspense fallback={<TasksSkeleton />}>
            <MostAgedContent initialContent={mostAgedContent} />
          </Suspense>
        </div>
      </div>

      {/* Brand Metrics Summary */}
      <div className="mt-8">
        <DashboardMetrics 
          metrics={{
            totalContent: metrics.totalContent,
            totalBrands: metrics.totalBrands,
            totalWorkflows: metrics.totalWorkflows
          }} 
        />
      </div>
    </div>
  );
} 