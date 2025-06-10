import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyTasks } from '@/components/dashboard/my-tasks';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';

async function getTeamActivity(supabase: any) {
  const profile = await getProfileWithAssignedBrands(supabase);
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
    type: item.status === 'draft' ? 'content_created' : 'content_updated',
    created_at: item.created_at,
    user: item.profiles,
    target: {
      id: item.id,
      name: item.title,
      type: 'content' as 'content',
    },
  }));
}

async function getMostAgedContent(supabase: any) {
  const profile = await getProfileWithAssignedBrands(supabase);
  if (!profile) return [];

  let query = supabase
    .from('content')
    .select('id, title, updated_at, status, brand_id, brands ( name )')
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
  return data;
}

async function getMyTasks(supabase: any) {
  const { data, error } = await supabase.rpc('get_user_details');
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const activityPromise = getTeamActivity(supabase);
  const agedContentPromise = getMostAgedContent(supabase);
  const tasksPromise = getMyTasks(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening across your workspace.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column for main feed */}
        <div className="lg:col-span-2 space-y-8">
          <Suspense fallback={<p>Loading activity...</p>}>
            <TeamActivityFeedWrapper activityPromise={activityPromise} />
          </Suspense>
          <Suspense fallback={<p>Loading stalled content...</p>}>
            <MostAgedContentWrapper agedContentPromise={agedContentPromise} />
          </Suspense>
        </div>
        
        {/* Right column for tasks */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
             <Suspense fallback={<TasksSkeleton />}>
               <MyTasksWrapper tasksPromise={tasksPromise} />
             </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper components to handle promises in Suspense
async function TeamActivityFeedWrapper({ activityPromise }: { activityPromise: Promise<any[]> }) {
  const activities = await activityPromise;
  return <TeamActivityFeed activities={activities} />;
}

async function MostAgedContentWrapper({ agedContentPromise }: { agedContentPromise: Promise<any[]> }) {
  const items = await agedContentPromise;
  return <MostAgedContent items={items} />;
}

async function MyTasksWrapper({ tasksPromise }: { tasksPromise: Promise<any[]> }) {
  const tasks = await tasksPromise;
  return <MyTasks tasks={tasks} />;
} 