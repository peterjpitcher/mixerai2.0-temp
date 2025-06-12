import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileWithAssignedBrands } from '@/lib/auth/user-profile';
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { MostAgedContent } from '@/components/dashboard/most-aged-content';
import { TasksSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { Card } from '@/components/ui/card';
import { MyTasks } from '@/components/dashboard/my-tasks';

async function getTeamActivity(supabase: any, profile: any) {
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

async function getMostAgedContent(supabase: any, profile: any) {
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

  return data.map((item: any) => ({
    ...item,
    brandName: item.brand?.name || 'N/A',
    brandColor: item.brand?.brand_color || '#888'
  }));
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const profile = await getProfileWithAssignedBrands(supabase);
  
  // Fetch data in parallel
  const [
    teamActivity,
    mostAgedContent
  ] = await Promise.all([
    getTeamActivity(supabase, profile),
    getMostAgedContent(supabase, profile)
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to MixerAI. View recent activity and manage your content tasks.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<TasksSkeleton />}>
            <TeamActivityFeed initialActivity={teamActivity} />
          </Suspense>
        </div>
        <div className="lg:col-span-2 space-y-6">
           <Suspense fallback={<TasksSkeleton />}>
             <MostAgedContent initialContent={mostAgedContent} />
           </Suspense>
           <Suspense fallback={<TasksSkeleton />}>
              <MyTasks />
           </Suspense>
        </div>
      </div>
    </div>
  );
} 