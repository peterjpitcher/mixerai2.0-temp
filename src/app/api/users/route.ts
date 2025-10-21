import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import type {
  BrandPermissionRecord,
  BrandRecord,
  InvitationStatusRecord,
  ProfileRecord,
} from './user-utils';
import { buildUserResponse } from './user-utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access this resource.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const perPageParam = Number.parseInt(searchParams.get('pageSize') ?? `${DEFAULT_PAGE_SIZE}`, 10);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const requestedPageSize = Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);

    const supabaseAdmin = createSupabaseAdminClient();
    const supabase = createSupabaseAdminClient();

    const [authUsersResult, totalCountResult] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).throwOnError(),
    ]);

    const { data: authUsersData, error: authError } = authUsersResult;
    if (authError) throw authError;
    if (!authUsersData) throw new Error('Failed to fetch auth users list.');

    const totalUsers = totalCountResult.count ?? authUsersData.users.length ?? 0;
    const authUsers = authUsersData.users ?? [];

    if (authUsers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          total: totalUsers,
        },
      });
    }

    const userIds = authUsers.map(authUser => authUser.id);

    const [profilesResult, brandPermissionsResult, invitationStatusResult, brandsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, job_title, company')
        .in('id', userIds),
      supabase
        .from('user_brand_permissions')
        .select('user_id, brand_id, role')
        .in('user_id', userIds),
      supabase
        .from('user_invitation_status')
        .select('*')
        .in('id', userIds),
      supabase.from('brands').select('id, name, brand_color, logo_url'),
    ]);

    const { data: profilesData, error: profilesError } = profilesResult;
    const { data: brandPermissionsData, error: brandPermissionsError } = brandPermissionsResult;
    const { data: invitationStatusData, error: invitationError } = invitationStatusResult;
    const { data: brandsData, error: brandsError } = brandsResult;

    if (profilesError) throw profilesError;
    if (brandPermissionsError) throw brandPermissionsError;
    if (brandsError) throw brandsError;
    if (invitationError) {
      console.error('[users] Failed to fetch invitation status data:', invitationError);
    }

    const profilesMap = new Map<string, ProfileRecord>(
      ((profilesData ?? []) as ProfileRecord[]).map(profile => [profile.id, profile])
    );

    const brandPermissionsByUser = new Map<string, BrandPermissionRecord[]>();
    ((brandPermissionsData ?? []) as BrandPermissionRecord[]).forEach(record => {
      if (!record.user_id) return;
      const list = brandPermissionsByUser.get(record.user_id) ?? [];
      list.push(record);
      brandPermissionsByUser.set(record.user_id, list);
    });

    const invitationStatusMap = new Map<string, InvitationStatusRecord>(
      ((invitationStatusData ?? []) as InvitationStatusRecord[]).map(status => [status.id, status])
    );

    const brandsMap = new Map<string, BrandRecord>(
      ((brandsData ?? []) as BrandRecord[]).map(brand => [brand.id, brand])
    );

    const mergedUsers = authUsers
      .map(authUser =>
        buildUserResponse(
          authUser,
          profilesMap.get(authUser.id),
          brandPermissionsByUser.get(authUser.id),
          brandsMap,
          invitationStatusMap.get(authUser.id),
          user.id
        )
      )
      .filter(merged => includeInactive || merged.user_status !== 'inactive');

    return NextResponse.json({
      success: true,
      data: mergedUsers,
      pagination: {
        page,
        pageSize,
        total: totalUsers,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Error fetching users');
  }
});
