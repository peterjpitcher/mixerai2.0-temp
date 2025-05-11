import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define the expected shape for profile data we work with in this route
interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

/**
 * GET endpoint to search for users by email or name
 * Used for user assignment in workflows
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchQuery = request.nextUrl.searchParams.get('query') || '';
    const limit = Number(request.nextUrl.searchParams.get('limit') || '10');
    
    const supabase = createSupabaseAdminClient();
    
    if (!searchQuery) {
      const { data: authUsersResponse, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: limit
      });
      
      if (authError) throw authError;
      if (!authUsersResponse) throw new Error('Failed to fetch auth users list.');
      
      const userIds = authUsersResponse.users.map(user => user.id);
      let profiles: ProfileSearchResult[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, job_title')
          .in('id', userIds);
        if (profilesError) throw profilesError;
        // Attempting a more lenient cast if direct cast fails due to Supabase type complexity
        profiles = ((profilesData || []) as any[]).map(p => p as ProfileSearchResult);
      }
      
      const users = authUsersResponse.users.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
          job_title: profile?.job_title || authUser.user_metadata?.job_title || null,
          avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`
        };
      });
      
      return NextResponse.json({ success: true, users });
    }
    
    const searchLower = searchQuery.toLowerCase();
    
    // Step 1: Search profiles by full_name
    const { data: matchingProfilesData, error: profilesSearchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title')
      .ilike('full_name', `%${searchQuery}%`)
      .limit(limit * 2); 

    if (profilesSearchError) throw profilesSearchError;
    // Attempting a more lenient cast
    const matchingProfiles = ((matchingProfilesData || []) as any[]).map(p => p as ProfileSearchResult);
    
    // Step 2: Fetch all auth users - this remains a potential bottleneck
    const { data: authUsersResponseAll, error: authErrorAll } = await supabase.auth.admin.listUsers();
    if (authErrorAll) throw authErrorAll;
    if (!authUsersResponseAll) throw new Error('Failed to fetch all auth users for search.');

    const allAuthUsers = authUsersResponseAll.users;
    const resultsMap = new Map<string, ProfileSearchResult & { email?: string | null }>();

    // Add users found by profile name match
    matchingProfiles.forEach(profile => {
        const authUser = allAuthUsers.find(u => u.id === profile.id);
        if (authUser) {
            resultsMap.set(profile.id, {
                id: authUser.id,
                email: authUser.email,
                full_name: profile.full_name || authUser.user_metadata?.full_name || null,
                job_title: profile.job_title || authUser.user_metadata?.job_title || null,
                avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`
            });
        }
    });

    // Step 3: Filter all auth users by email and add if not already present by name match
    allAuthUsers.forEach(authUser => {
        if (resultsMap.size >= limit && !resultsMap.has(authUser.id)) return; // Optimization: stop if limit reached from combined results
        if (resultsMap.has(authUser.id)) return; 

        if (authUser.email?.toLowerCase().includes(searchLower)) {
            // Attempt to find if this authUser already had their profile fetched by the name search
            const profile = matchingProfiles.find(p => p.id === authUser.id);
            resultsMap.set(authUser.id, {
                id: authUser.id,
                email: authUser.email,
                full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
                job_title: profile?.job_title || authUser.user_metadata?.job_title || null,
                avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`
            });
        }
    });
    
    const combinedUsers = Array.from(resultsMap.values()).slice(0, limit);
    
    return NextResponse.json({ success: true, users: combinedUsers });

  } catch (error) {
    return handleApiError(error, 'Error searching users');
  }
}); 