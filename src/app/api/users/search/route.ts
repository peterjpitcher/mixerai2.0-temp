import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
// import { Database } from '@/types/supabase'; // For stricter typing

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

/**
 * GET endpoint to search for users by email or name.
 * Optimized to query the 'profiles' table directly.
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Temporarily remove strict admin check for broader accessibility during development
    // Original check:
    // if (!sessionUser.user_metadata || sessionUser.user_metadata.role !== 'admin') {
    //   return NextResponse.json(
    //     { success: false, error: 'Forbidden: You do not have permission to access this resource.' },
    //     { status: 403 }
    //   );
    // }

    const searchQuery = request.nextUrl.searchParams.get('query') || '';
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid limit parameter' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();
    let users: UserSearchResult[] = [];

    if (!searchQuery) {
      // If no search query, return a list of recently active or all users (first N profiles for now)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, job_title')
        .order('updated_at', { ascending: false }) // Example: order by recent activity
        .limit(limit);

      if (profilesError) throw profilesError;
      users = (profilesData || []).map(p => ({
        ...p,
        avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
      }));

    } else {
      // If there is a search query, search in profiles table using OR condition
      // Escape special characters to prevent SQL injection
      const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, job_title')
        .or(`full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
        .limit(limit);

      if (profilesError) throw profilesError;
      users = (profilesData || []).map(p => ({
        ...p,
        avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
      }));
    }
    
    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error('Error searching users:', error);
    return handleApiError(error, 'Error searching users');
  }
}); 