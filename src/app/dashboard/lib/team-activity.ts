import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityType } from '@/components/dashboard/team-activity-feed';

export type DashboardProfile = { role?: string; assigned_brands?: string[] } | null;

const statusToActivityType = (status: string | null | undefined): ActivityType => {
  switch (status) {
    case 'draft':
      return 'content_created';
    case 'pending_review':
      return 'content_submitted';
    case 'approved':
      return 'content_approved';
    case 'rejected':
      return 'content_rejected';
    case 'published':
      return 'content_published';
    default:
      return 'content_updated';
  }
};

export async function getTeamActivity(
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

  if (limit <= 0) {
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
    .range(0, Math.max(0, limit - 1));

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
    type: statusToActivityType(item.status),
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

export { statusToActivityType };
