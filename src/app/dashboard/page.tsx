import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';
import type { SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // TODO: Uncomment when types are regenerated
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { MyTasks } from '@/components/dashboard/my-tasks';

async function getTeamActivity(supabase: SupabaseClient, profile: { role?: string; assigned_brands?: string[] } | null) { // TODO: Type as SupabaseClient<Database> when types are regenerated
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
    .limit(30);

  if (error) {
    console.error('Error fetching team activity:', error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    type: item.status === 'draft' ? 'content_created' as const : 'content_updated' as const,
    created_at: item.created_at || new Date().toISOString(),
    user: (() => {
      const rawProfile = (item as any).profiles;
      const profileRecord = Array.isArray(rawProfile) ? rawProfile?.[0] : rawProfile;
      return {
        id: profileRecord?.id ?? '',
        full_name: profileRecord?.full_name ?? null,
        avatar_url: profileRecord?.avatar_url ?? null,
      };
    })(),
    target: {
      id: item.id,
      name: item.title,
      type: 'content' as const,
    },
  }));
}

async function getMostAgedContent(supabase: SupabaseClient<any>, profile: { role?: string; assigned_brands?: string[] } | null) { // TODO: Type as SupabaseClient<Database> when types are regenerated
  if (!profile) return [];

  const now = new Date();
  const staleThreshold = new Date(now);
  staleThreshold.setDate(staleThreshold.getDate() - 7);

  let query = supabase
    .from('content')
    .select('id, title, updated_at, created_at, due_date, status, brand_id, brands ( name, brand_color, logo_url )')
    .in('status', ['draft', 'pending_review']);

  if (profile.role !== 'admin') {
    if (!profile.assigned_brands || profile.assigned_brands.length === 0) return [];
    query = query.in('brand_id', profile.assigned_brands);
  }

  query = query.or(
    `updated_at.lte.${staleThreshold.toISOString()},updated_at.is.null,due_date.lt.${now.toISOString()}`
  );

  const { data, error } = await query
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(50);

  if (error) {
    console.error('Error fetching most aged content:', error);
    return [];
  }

  const processed = (data || [])
    .reduce<Array<{
      id: string;
      title: string;
      updated_at: string | null;
      created_at: string | null;
      due_date: string | null;
      status: string;
      brand_id: string | null;
      brands: any;
      isOverdue: boolean;
      isStale: boolean;
      stalledSince: string;
    }>>((acc, item) => {
      const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      const dueDate = item.due_date ? new Date(item.due_date) : null;

      const isOverdue = Boolean(dueDate && dueDate < now);
      const referenceForStale = updatedAt ?? createdAt;
      const isStale = referenceForStale ? referenceForStale <= staleThreshold : true;

      if (!isOverdue && !isStale) {
        return acc;
      }

      const anchors: number[] = [];
      if (isOverdue && dueDate) anchors.push(dueDate.getTime());
      if (isStale && updatedAt) anchors.push(updatedAt.getTime());
      if (isStale && !updatedAt && createdAt) anchors.push(createdAt.getTime());
      if (anchors.length === 0) {
        anchors.push(referenceForStale ? referenceForStale.getTime() : now.getTime());
      }

      const stalledSince = new Date(Math.min(...anchors)).toISOString();
      const { brands, ...rest } = item;

      acc.push({
        ...rest,
        brands: brands as any, // TODO: Remove type assertion when types are regenerated
        isOverdue,
        isStale,
        stalledSince,
      });

      return acc;
    }, [])
    .sort((a, b) => new Date(a.stalledSince).getTime() - new Date(b.stalledSince).getTime())
    .slice(0, 5);

  return processed;
}

async function getDashboardMetrics(supabase: SupabaseClient<any>, profile: { role?: string; assigned_brands?: string[] } | null) { // TODO: Type as SupabaseClient<Database> when types are regenerated
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
    const pendingReviews = contentResult.data?.filter((c) => c.status === 'pending_review').length || 0;

    // Get pending tasks count
    const { count: pendingTasksCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user.id)
      .eq('status', 'pending');

    // Get completed tasks this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: completedThisWeekCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user.id)
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
      .eq('id', user.id)
      .single();
    userProfile = data as any;
  }
  
  // Fetch data in parallel
  const [teamActivity, mostAgedContent] = await Promise.all([
    getTeamActivity(supabase, profile),
    getMostAgedContent(supabase, profile),
  ]);

  return (
    <div className="space-y-8">
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
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]">
            <Suspense fallback={<TasksSkeleton />}>
              <TeamActivityFeed initialActivity={teamActivity} condensed={true} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
} 
