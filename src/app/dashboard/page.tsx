import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';
import type { SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // TODO: Uncomment when types are regenerated
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { MyTasks } from '@/components/dashboard/my-tasks';

type DashboardProfile = { role?: string; assigned_brands?: string[] } | null;

async function getTeamActivity(
  supabase: SupabaseClient,
  profile: DashboardProfile,
  limit = 30
) {
  if (!profile) {
    return { activity: [], hasMore: false };
  }

  const isAdmin = profile.role === 'admin';
  const assignedBrands = isAdmin ? [] : profile.assigned_brands ?? [];
  if (!isAdmin && assignedBrands.length === 0) {
    return { activity: [], hasMore: false };
  }

  const allProfiles = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();

  const baseQuery = supabase
    .from('content')
    .select(
      `
        id,
        created_at,
        title,
        status,
        created_by,
        brand_id
      `,
      { count: 'exact' }
    );

  const query = !isAdmin
    ? baseQuery.in('brand_id', assignedBrands)
    : baseQuery;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(0, limit);

  if (error) {
    console.error('Error fetching team activity:', error);
    return { activity: [], hasMore: false };
  }

  const userIds = Array.from(
    new Set((data ?? []).map(item => item.created_by).filter(Boolean) as string[])
  );

  if (userIds.length) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (!profilesError && Array.isArray(profilesData)) {
      profilesData.forEach(profileRecord => {
        allProfiles.set(profileRecord.id, {
          id: profileRecord.id,
          full_name: profileRecord.full_name ?? null,
          avatar_url: profileRecord.avatar_url ?? null,
        });
      });
    }
  }

  const activity = (data || []).map((item) => ({
    id: item.id,
    type: item.status === 'draft' ? 'content_created' as const : 'content_updated' as const,
    created_at: item.created_at || new Date().toISOString(),
    user: allProfiles.get(item.created_by as string) ?? {
      id: item.created_by as string,
      full_name: null,
      avatar_url: null,
    },
    target: {
      id: item.id,
      name: item.title ?? 'Untitled content',
      type: 'content' as const,
    },
  }));

  return {
    activity,
    hasMore: typeof count === 'number' ? activity.length < count : false,
  };
}

async function getMostAgedContent(
  supabase: SupabaseClient<any>,
  profile: DashboardProfile,
  limit = 5
) {
  if (!profile) return [];

  const isAdmin = profile.role === 'admin';
  const assignedBrands = isAdmin ? [] : profile.assigned_brands ?? [];
  if (!isAdmin && assignedBrands.length === 0) {
    return [];
  }

  const now = new Date();
  const staleThreshold = new Date(now);
  staleThreshold.setDate(staleThreshold.getDate() - 7);

  let query = supabase
    .from('content')
    .select('id, title, updated_at, created_at, due_date, status, brand_id, brands ( name, brand_color, logo_url )')
    .in('status', ['draft', 'pending_review']);

  if (!isAdmin) {
    query = query.in('brand_id', assignedBrands);
  }

  query = query.or(
    `updated_at.lte.${staleThreshold.toISOString()},updated_at.is.null,due_date.lt.${now.toISOString()}`
  );

  const { data, error } = await query
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(limit * 3); // fetch a few extra so we can filter client-side

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
        brands: brands as any,
        isOverdue,
        isStale,
        stalledSince,
      });

      return acc;
    }, [])
    .sort((a, b) => new Date(a.stalledSince).getTime() - new Date(b.stalledSince).getTime())
    .slice(0, limit);

  return processed;
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
  const [{ activity: teamActivity, hasMore }, mostAgedContent] = await Promise.all([
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
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] space-y-4">
            <Suspense fallback={<TasksSkeleton />}>
              <TeamActivityFeed initialActivity={teamActivity} condensed />
            </Suspense>
            {hasMore && (
              <div className="text-center text-xs text-muted-foreground">
                Showing the latest {teamActivity.length} activities. Visit the activity log for more.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
