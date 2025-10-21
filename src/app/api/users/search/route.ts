import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { isGlobalAdmin } from '@/lib/auth/user-role';
import { z } from 'zod';
import type {
  BrandPermissionRecord,
  BrandRecord,
  InvitationStatusRecord,
  ProfileRecord,
} from '../user-utils';
import { buildUserResponse } from '../user-utils';

const SearchSchema = z.object({
  query: z.string().trim().max(100).default(''),
  brandId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  page: z.coerce.number().int().min(1).default(1),
  includeInactive: z.coerce.boolean().optional(),
});

export const GET = withAuth(async (request: NextRequest, sessionUser) => {
  try {
    const supabaseRls = createSupabaseServerClient();
    const supabase = createSupabaseAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const validation = SearchSchema.safeParse({
      query: searchParams.get('query') ?? '',
      brandId: searchParams.get('brandId') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      includeInactive: searchParams.get('includeInactive') ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { query, brandId, limit, page, includeInactive } = validation.data;

    if (query && query.length > 0 && query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search term must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const isAdmin = isGlobalAdmin(sessionUser);
    let brandScopeUserIds: string[] | null = null;

    if (brandId) {
      if (!isAdmin) {
        try {
          await requireBrandAccess(supabaseRls, sessionUser, brandId);
        } catch (error) {
          if (error instanceof BrandPermissionVerificationError) {
            return NextResponse.json(
              { success: false, error: 'Unable to verify brand permissions. Please try again later.' },
              { status: 500 }
            );
          }
          if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
            return NextResponse.json(
              { success: false, error: 'You do not have permission to view users for this brand.' },
              { status: 403 }
            );
          }
          throw error;
        }
      }

      const { data: brandUsers, error: brandUsersError } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .eq('brand_id', brandId);

      if (brandUsersError) {
        console.error('[users/search] Failed to load brand user permissions', brandUsersError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand users.' },
          { status: 500 }
        );
      }

      brandScopeUserIds = (brandUsers ?? [])
        .map(record => record.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (brandScopeUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        });
      }
    } else if (!isAdmin) {
      const { data: accessibleBrands, error: brandsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', sessionUser.id);

      if (brandsError) {
        console.error('[users/search] Failed to load accessible brands', brandsError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand context.' },
          { status: 500 }
        );
      }

      const permittedBrandIds = (accessibleBrands ?? [])
        .map(record => record.brand_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (permittedBrandIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        });
      }

      const { data: brandUsers, error: brandUsersError } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .in('brand_id', permittedBrandIds);

      if (brandUsersError) {
        console.error('[users/search] Failed to load scoped brand users', brandUsersError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand users.' },
          { status: 500 }
        );
      }

      brandScopeUserIds = Array.from(
        new Set(
          (brandUsers ?? [])
            .map(record => record.user_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );

      if (brandScopeUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        });
      }
    }

    const offset = (page - 1) * limit;

    const escapedQuery = query.replace(/[%_]/g, '\\$&');

    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, job_title, company', { count: 'exact' })
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    if (escapedQuery) {
      profilesQuery = profilesQuery.or(
        `full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`
      );
    }

    if (brandScopeUserIds && brandScopeUserIds.length > 0) {
      profilesQuery = profilesQuery.in('id', brandScopeUserIds);
    }

    const { data: profilesData, error: profilesError, count } = await profilesQuery;

    if (profilesError) {
      console.error('[users/search] Failed to load profiles', profilesError);
      throw profilesError;
    }

    const profileRows = (profilesData ?? []) as ProfileRecord[];
    const userIds = profileRows.map(profile => profile.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        pagination: {
          page,
          limit,
          total: count ?? 0,
        },
      });
    }

    const [authUsers, brandPermissionsResult, invitationStatusResult, brandsResult] = await Promise.all([
      Promise.all(
        userIds.map(async id => {
          try {
            const { data } = await supabase.auth.admin.getUserById(id);
            return data?.user ?? null;
          } catch (error) {
            console.error('[users/search] Failed to fetch auth user', id, error);
            return null;
          }
        })
      ).then(results => results.filter((user): user is NonNullable<typeof user> => Boolean(user))),
      supabase
        .from('user_brand_permissions')
        .select('user_id, brand_id, role')
        .in('user_id', userIds),
      supabase
        .from('user_invitation_status')
        .select('*')
        .in('id', userIds),
      supabase
        .from('brands')
        .select('id, name, brand_color, logo_url'),
    ]);

    const { data: brandPermissionsData, error: brandPermissionsError } = brandPermissionsResult;
    const { data: invitationStatusData, error: invitationError } = invitationStatusResult;
    const { data: brandsData, error: brandsError } = brandsResult;

    if (brandPermissionsError) throw brandPermissionsError;
    if (brandsError) throw brandsError;
    if (invitationError) {
      console.error('[users/search] Failed to fetch invitation status data:', invitationError);
    }

    const profilesMap = new Map<string, ProfileRecord>(profileRows.map(profile => [profile.id, profile]));

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
          sessionUser.id
        )
      )
      .filter(merged => includeInactive || merged.user_status !== 'inactive');

    return NextResponse.json({
      success: true,
      users: mergedUsers,
      pagination: {
        page,
        limit,
        total: count ?? mergedUsers.length,
      },
    });
  } catch (error) {
    console.error('[users/search] Error searching users:', error);
    return handleApiError(error, 'Error searching users');
  }
});
