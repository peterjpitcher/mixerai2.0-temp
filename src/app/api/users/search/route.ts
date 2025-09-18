import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
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
    
    const isAdmin = sessionUser.user_metadata?.role === 'admin';

    // Check brand access if brandId provided and caller is not platform admin
    if (brandId && !isAdmin) {
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

    // TODO: Use active_brand_users_v view after migration is applied
    // For now, use profiles table with manual filtering
    
    // First get active user IDs
    const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const activeUserIds = authUsers
      ?.filter(u => !u.user_metadata?.deleted_at && u.user_metadata?.status !== 'inactive')
      ?.map(u => u.id) || [];

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
      .in('id', activeUserIds); // Only active users

    // Filter by brand if provided
    if (brandId) {
      // For brand filtering, we need to join with user_brand_permissions
      const { data: brandUsers, error: brandUsersError } = await supabase
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

      const brandUserIds = brandUsers?.map(bu => bu.user_id).filter((id): id is string => id !== null) || [];
      dbQuery = dbQuery.in('id', brandUserIds);
    } else {
      // If no brand specified, get brands the current user has access to
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

      if (userBrands && userBrands.length > 0 && !isAdmin) {
        const brandIds = userBrands.map(ub => ub.brand_id).filter((id): id is string => !!id);
        if (brandIds.length > 0) {
          const { data: brandUsers, error: brandUsersError } = await supabase
            .from('user_brand_permissions')
            .select('user_id')
            .in('brand_id', brandIds)
            .in('user_id', activeUserIds);

          if (brandUsersError) {
            console.error('[users/search] Failed to load brand users for accessible brands', brandUsersError);
            return NextResponse.json(
              { success: false, error: 'Unable to load users for accessible brands.' },
              { status: 500 }
            );
          }

          const brandUserIds = brandUsers?.map(bu => bu.user_id).filter((id): id is string => id !== null) || [];
          dbQuery = dbQuery.in('id', brandUserIds);
        }
      }
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

    const { data: users, error } = await dbQuery;

    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }

    // Add default avatars for users without one
    const enrichedUsers: UserSearchResult[] = (users || []).map(user => ({
      ...user,
      avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    }));
    
    return NextResponse.json({ 
      success: true, 
      users: enrichedUsers,
      count: enrichedUsers.length,
      metadata: {
        brandId,
        searchQuery,
        limit
      }
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return handleApiError(error, 'Error searching users');
  }
}); 
