import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
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
    
    // TODO: Use active_brand_users_v view after migration is applied
    // For now, use profiles table with manual filtering
    
    // First get active user IDs
    const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
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
      const { data: brandUsers } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .eq('brand_id', brandId)
        .in('user_id', activeUserIds);
      
      const brandUserIds = brandUsers?.map(bu => bu.user_id).filter((id): id is string => id !== null) || [];
      dbQuery = dbQuery.in('id', brandUserIds);
    } else {
      // If no brand specified, get brands the current user has access to
      const { data: userBrands } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', sessionUser.id);
      
      if (userBrands && userBrands.length > 0) {
        const { data: brandUsers } = await supabase
          .from('user_brand_permissions')
          .select('user_id')
          .in('brand_id', userBrands.map(ub => ub.brand_id))
          .in('user_id', activeUserIds);
        
        const brandUserIds = brandUsers?.map(bu => bu.user_id).filter((id): id is string => id !== null) || [];
        dbQuery = dbQuery.in('id', brandUserIds);
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