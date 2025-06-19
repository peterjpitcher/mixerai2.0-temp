import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { MyTasks } from '@/components/dashboard/my-tasks';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { StatCard } from '@/components/dashboard/stat-card';
import { FileText, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

async function getTeamActivity(supabase: SupabaseClient<Database>, profile: { role?: string; assigned_brands?: string[] } | null) {
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
    // @ts-ignore - Type issue with Supabase query builder
    query = query.in('brand_id', profile.assigned_brands);
  }
    
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching team activity:', error);
    return [];
  }

  return (data || []).map((item) => ({
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

async function getMostAgedContent(supabase: SupabaseClient<Database>, profile: { role?: string; assigned_brands?: string[] } | null) {
  if (!profile) return [];

  let query = supabase
    .from('content')
    .select('id, title, updated_at, status, brand_id, brands ( name, brand_color )')
    // @ts-ignore - Type issue with Supabase query builder
    .in('status', ['draft', 'pending_review']);

  if (profile.role !== 'admin') {
    if (!profile.assigned_brands || profile.assigned_brands.length === 0) return [];
    // @ts-ignore - Type issue with Supabase query builder
    query = query.in('brand_id', profile.assigned_brands);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error fetching most aged content:', error);
    return [];
  }

  return (data || [])
    .filter((item) => item.updated_at !== null)
    .map((item) => ({
      ...item,
      updated_at: item.updated_at!,
      brandName: item.brands?.name || 'N/A',
      brandColor: item.brands?.brand_color || '#888'
    }));
}

async function getDashboardMetrics(supabase: SupabaseClient<Database>, profile: { role?: string; assigned_brands?: string[] } | null) {
  if (!profile) return { totalContent: 0, totalBrands: 0, totalWorkflows: 0, pendingTasks: 0, completedThisWeek: 0, pendingReviews: 0 };

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalContent: 0, totalBrands: 0, totalWorkflows: 0, pendingTasks: 0, completedThisWeek: 0, pendingReviews: 0 };

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
      // @ts-ignore - Type issue with Supabase query builder
      contentQuery = contentQuery.in('brand_id', profile.assigned_brands);
      // @ts-ignore - Type issue with Supabase query builder
      brandsQuery = brandsQuery.in('id', profile.assigned_brands);
      // @ts-ignore - Type issue with Supabase query builder
      workflowsQuery = workflowsQuery.in('brand_id', profile.assigned_brands);
    }

    const [contentResult, brandsResult, workflowsResult] = await Promise.all([
      contentQuery,
      brandsQuery,
      workflowsQuery
    ]);

    // Count pending reviews
    const pendingReviews = contentResult.data?.filter((c) => c.status === 'pending_review').length || 0;

    // Get pending tasks count
    const { count: pendingTasksCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      // @ts-ignore - Type issue with Supabase
      .eq('assigned_to', user.id)
      // @ts-ignore - Type issue with Supabase
      .eq('status', 'pending');

    // Get completed tasks this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: completedThisWeekCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      // @ts-ignore - Type issue with Supabase
      .eq('assigned_to', user.id)
      // @ts-ignore - Type issue with Supabase
      .eq('status', 'completed')
      // @ts-ignore - Type issue with Supabase
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

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const profile = await getProfileWithAssignedBrands(supabase as any);
  
  // Fetch user profile data
  const { data: { user } } = await supabase.auth.getUser();
  let userProfile: { full_name?: string } | null = null;
  
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      // @ts-ignore - Type issue with Supabase  
      .eq('id', user.id)
      .single();
    userProfile = data as any;
  }
  
  // Fetch data in parallel
  const [
    teamActivity,
    mostAgedContent,
    metrics
  ] = await Promise.all([
    getTeamActivity(supabase, profile),
    getMostAgedContent(supabase, profile),
    getDashboardMetrics(supabase, profile)
  ]);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      
      {/* Header with welcome message */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your content today.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* All Key Metrics at the top (smaller) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="Total Content"
                value={metrics.totalContent}
                icon={FileText}
                description="across all brands"
              />
            </div>
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="Pending Tasks"
                value={metrics.pendingTasks}
                icon={Clock}
                description="awaiting action"
              />
            </div>
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="Completed"
                value={metrics.completedThisWeek}
                icon={CheckCircle2}
                description="this week"
              />
            </div>
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="In Review"
                value={metrics.pendingReviews}
                icon={BarChart3}
                description="content items"
              />
            </div>
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="Total Brands"
                value={metrics.totalBrands}
                icon={FileText}
                description="active brands"
              />
            </div>
            <div className="scale-[0.85] origin-top-left">
              <StatCard
                title="Workflows"
                value={metrics.totalWorkflows}
                icon={FileText}
                description="active workflows"
              />
            </div>
          </div>

          {/* My Tasks */}
          <Suspense fallback={<TasksSkeleton />}>
            <MyTasks />
          </Suspense>

          {/* Stalled Content */}
          <Suspense fallback={<TasksSkeleton />}>
            <MostAgedContent initialContent={mostAgedContent} />
          </Suspense>
        </div>
        
        {/* Right Column - Team Activity (Condensed, Full Height) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 lg:h-[calc(100vh-120px)]">
          <Suspense fallback={<TasksSkeleton />}>
            <TeamActivityFeed initialActivity={teamActivity} condensed={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 