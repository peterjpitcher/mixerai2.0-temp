import type { SupabaseClient } from '@supabase/supabase-js';
import { getTeamActivity } from '@/app/dashboard/lib/team-activity';

type QueryResponse<T> = {
  data: T;
  error: null;
  count?: number | null;
};

type ContentRow = {
  id: string;
  created_at: string;
  title: string;
  status: string;
  created_by: string;
  brand_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const createSupabaseMock = (
  contentRows: ContentRow[],
  profilesRows: ProfileRow[],
  count: number | null
) => {
  let capturedRange: [number, number] | null = null;

  const contentBuilder = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockImplementation((from: number, to: number) => {
      capturedRange = [from, to];
      const response: QueryResponse<ContentRow[]> = {
        data: contentRows,
        error: null,
        count,
      };
      return Promise.resolve(response);
    }),
    in: jest.fn().mockReturnThis(),
  };

  const profilesBuilder = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockImplementation(() => {
      const response: QueryResponse<ProfileRow[]> = {
        data: profilesRows,
        error: null,
      };
      return Promise.resolve(response);
    }),
  };

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'content') return contentBuilder;
      if (table === 'profiles') return profilesBuilder;
      throw new Error(`Unexpected table requested: ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { supabase, contentBuilder, profilesBuilder, getRange: () => capturedRange };
};

describe('getTeamActivity', () => {
  it('maps content statuses to activity types and uses non-inclusive range', async () => {
    const contentRows: ContentRow[] = [
      { id: '1', created_at: '2024-01-01T00:00:00Z', title: 'Draft item', status: 'draft', created_by: 'user-a', brand_id: 'brand-1' },
      { id: '2', created_at: '2024-01-02T00:00:00Z', title: 'Pending review', status: 'pending_review', created_by: 'user-b', brand_id: 'brand-1' },
      { id: '3', created_at: '2024-01-03T00:00:00Z', title: 'Approved', status: 'approved', created_by: 'user-c', brand_id: 'brand-1' },
      { id: '4', created_at: '2024-01-04T00:00:00Z', title: 'Rejected', status: 'rejected', created_by: 'user-d', brand_id: 'brand-1' },
      { id: '5', created_at: '2024-01-05T00:00:00Z', title: 'Published', status: 'published', created_by: 'user-e', brand_id: 'brand-2' },
      { id: '6', created_at: '2024-01-06T00:00:00Z', title: 'Cancelled', status: 'cancelled', created_by: 'user-f', brand_id: 'brand-2' },
    ];

    const profilesRows: ProfileRow[] = [
      { id: 'user-a', full_name: 'A', avatar_url: null },
      { id: 'user-b', full_name: 'B', avatar_url: null },
      { id: 'user-c', full_name: 'C', avatar_url: null },
      { id: 'user-d', full_name: 'D', avatar_url: null },
      { id: 'user-e', full_name: 'E', avatar_url: null },
      { id: 'user-f', full_name: 'F', avatar_url: null },
    ];

    const { supabase, getRange } = createSupabaseMock(contentRows, profilesRows, contentRows.length);

    const result = await getTeamActivity(
      supabase,
      { role: 'admin', assigned_brands: [] },
      6
    );

    expect(result.activity.map(item => item.type)).toEqual([
      'content_created',
      'content_submitted',
      'content_approved',
      'content_rejected',
      'content_published',
      'content_updated',
    ]);

    expect(getRange()).toEqual([0, 5]);
    expect(result.hasMore).toBe(false);
  });

  it('returns hasMore when count exceeds fetched rows', async () => {
    const contentRows: ContentRow[] = [
      { id: '1', created_at: '2024-01-01T00:00:00Z', title: 'Item', status: 'draft', created_by: 'user-a', brand_id: 'brand-1' },
      { id: '2', created_at: '2024-01-02T00:00:00Z', title: 'Item 2', status: 'approved', created_by: 'user-b', brand_id: 'brand-1' },
      { id: '3', created_at: '2024-01-03T00:00:00Z', title: 'Item 3', status: 'pending_review', created_by: 'user-c', brand_id: 'brand-1' },
    ];

    const profilesRows: ProfileRow[] = [
      { id: 'user-a', full_name: 'A', avatar_url: null },
      { id: 'user-b', full_name: 'B', avatar_url: null },
      { id: 'user-c', full_name: 'C', avatar_url: null },
    ];

    const { supabase, getRange } = createSupabaseMock(contentRows, profilesRows, 10);

    const result = await getTeamActivity(
      supabase,
      { role: 'admin', assigned_brands: [] },
      3
    );

    expect(result.hasMore).toBe(true);
    expect(getRange()).toEqual([0, 2]);
  });
});
