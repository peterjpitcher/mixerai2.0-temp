import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Define the extended profile type that includes job_title
interface ExtendedProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title?: string;
  job_description?: string;
  created_at: string;
  updated_at: string;
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
    
    // If search query is empty, return recent users
    if (!searchQuery) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: limit
      });
      
      if (authError) throw authError;
      
      // Get profiles for these users
      const userIds = authUsers.users.map(user => user.id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Format the response
      const users = authUsers.users.map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id) as ExtendedProfile | undefined;
        
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
          job_title: profile?.job_title || authUser.user_metadata?.job_title || '',
          avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`
        };
      });
      
      return NextResponse.json({ 
        success: true, 
        users 
      });
    }
    
    // If search query is provided, search for users by email or name
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;
    
    // Filter users by search query (case-insensitive)
    const searchLower = searchQuery.toLowerCase();
    
    const matchedUsers = authUsers.users.filter(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id) as ExtendedProfile | undefined;
      const fullName = profile?.full_name || authUser.user_metadata?.full_name || '';
      const email = authUser.email || '';
      
      return (
        email.toLowerCase().includes(searchLower) || 
        fullName.toLowerCase().includes(searchLower)
      );
    }).slice(0, limit);
    
    // Format the matched users
    const users = matchedUsers.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id) as ExtendedProfile | undefined;
      
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
        job_title: profile?.job_title || authUser.user_metadata?.job_title || '',
        avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`
      };
    });
    
    return NextResponse.json({ 
      success: true, 
      users 
    });
  } catch (error) {
    return handleApiError(error, 'Error searching users');
  }
}); 