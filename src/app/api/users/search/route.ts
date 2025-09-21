import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { isGlobalAdmin } from '@/lib/auth/user-role';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Input validation schema
const SearchSchema = z.object({
  query: z.string().min(0).max(100).default(''),
  brandId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10)
});

interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

/**
 * GET endpoint to search for users by email or name.
 * Uses brand-scoped view to ensure only active, non-deleted users are returned.
 * Implements proper multi-tenant safety and search performance optimizations.
 */
export const GET = withAuth(async (request: NextRequest, sessionUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate input
    const validation = SearchSchema.safeParse({
      query: searchParams.get('query') || '',
      brandId: searchParams.get('brandId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { query: searchQuery, brandId, limit } = validation.data;

    // Minimum search term length for performance
    if (searchQuery && searchQuery.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search term must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();

    const isAdmin = isGlobalAdmin(sessionUser);
    const authUsersMap = new Map<string, any>();

    let permittedBrandIds: string[] = [];
    if (brandId) {
      if (!isAdmin) {
        try {
          await requireBrandAccess(supabase, sessionUser, brandId);
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
      permittedBrandIds = [brandId];
    } else if (!isAdmin) {
      const { data: userBrands, error: userBrandsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', sessionUser.id);

      if (userBrandsError) {
        console.error('[users/search] Failed to load user brand permissions', userBrandsError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand context.' },
          { status: 500 }
        );
      }

      permittedBrandIds = (userBrands || [])
        .map(record => record.brand_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (permittedBrandIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          count: 0,
          metadata: { brandId, searchQuery, limit }
        });
      }
    }

    if (isAdmin) {
      const { data: authUsersData } = await adminSupabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      authUsersData?.users?.forEach((authUser) => {
        if (authUser.user_metadata?.deleted_at || authUser.user_metadata?.status === 'inactive') {
          return;
        }
        authUsersMap.set(authUser.id, authUser);
      });
    } else {
      const candidateIds = new Set<string>();

      const { data: brandUsers, error: brandUsersError } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .in('brand_id', permittedBrandIds);

      if (brandUsersError) {
        console.error('[users/search] Failed to load brand user permissions', brandUsersError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand users.' },
          { status: 500 }
        );
      }

      brandUsers?.forEach(record => {
        if (record.user_id) {
          candidateIds.add(record.user_id);
        }
      });

      candidateIds.add(sessionUser.id);

      if (candidateIds.size === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          count: 0,
          metadata: { brandId, searchQuery, limit }
        });
      }

      const candidateResults = await Promise.all(
        Array.from(candidateIds).map(async (userId) => {
          try {
            const { data } = await adminSupabase.auth.admin.getUserById(userId);
            const user = data?.user;
            if (!user) return null;
            if (user.user_metadata?.deleted_at || user.user_metadata?.status === 'inactive') {
              return null;
            }
            return user;
          } catch (error) {
            console.error('[users/search] Failed to load auth user by id', userId, error);
            return null;
          }
        })
      );

      candidateResults.forEach((user) => {
        if (user) {
          authUsersMap.set(user.id, user);
        }
      });
    }

    const activeUserIds = Array.from(authUsersMap.keys());

    if (activeUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        count: 0,
        metadata: { brandId, searchQuery, limit }
      });
    }

    let dbQuery = supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, job_title')
      .in('id', activeUserIds);

    if (brandId) {
      const { data: brandScopedUsers, error: brandUsersError } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .eq('brand_id', brandId)
        .in('user_id', activeUserIds);

      if (brandUsersError) {
        console.error('[users/search] Failed to load brand user permissions', brandUsersError);
        return NextResponse.json(
          { success: false, error: 'Unable to load brand users.' },
          { status: 500 }
        );
      }

      const brandUserIds = brandScopedUsers?.map(record => record.user_id).filter((id): id is string => !!id) || [];
      dbQuery = dbQuery.in('id', brandUserIds);
    }

    // Apply search filter if query provided
    if (searchQuery) {
      // Escape special characters to prevent SQL injection
      const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&');
      dbQuery = dbQuery.or(`email.ilike.%${escapedQuery}%,full_name.ilike.%${escapedQuery}%`);
    }

    // Add deterministic ordering for pagination stability
    dbQuery = dbQuery
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);

    const { data: profileRows, error } = await dbQuery;

    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }

    const results: UserSearchResult[] = (profileRows || []).map((profile) => {
      const authUser = authUsersMap.get(profile.id);
      const email = authUser?.email || (profile as Record<string, unknown>).email || '';
      const fullName = profile.full_name || authUser?.user_metadata?.full_name || 'Unnamed User';
      const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`;
      const jobTitle = profile.job_title || authUser?.user_metadata?.job_title || '';

      return {
        id: profile.id,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        job_title: jobTitle,
      } satisfies UserSearchResult;
    });

    return NextResponse.json({
      success: true,
      users: results,
      count: results.length,
      metadata: {
        brandId,
        searchQuery,
        limit,
      },
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return handleApiError(error, 'Error searching users');
  }
}); 
