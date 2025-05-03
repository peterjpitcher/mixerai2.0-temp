import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

// Define the shape of user profiles returned from Supabase
interface ProfileRecord {
  id: string;
  full_name: string | null;
  email?: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  user_brand_permissions?: {
    id: string;
    brand_id: string;
    role: 'admin' | 'editor' | 'viewer';
  }[];
}

/**
 * GET endpoint to retrieve all users with profile information
 */
export async function GET() {
  try {
    // During static site generation, return mock data
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Returning mock users during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        users: [
          {
            id: '1',
            full_name: 'Admin User',
            email: 'admin@example.com',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            role: 'Admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            brand_permissions: [
              { id: '1', brand_id: '1', role: 'admin' }
            ]
          },
          {
            id: '2',
            full_name: 'Editor User',
            email: 'editor@example.com',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor',
            role: 'Editor',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            brand_permissions: [
              { id: '2', brand_id: '1', role: 'editor' }
            ]
          }
        ]
      });
    }
    
    const supabase = createSupabaseAdminClient();
    
    // First, get all users from auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    // Get all user profiles with associated role information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_brand_permissions:user_brand_permissions(
          id,
          brand_id,
          role
        )
      `)
      .order('created_at', { ascending: false });
    
    if (profilesError) throw profilesError;
    
    // Merge auth users with profiles where available
    const mergedUsers = authUsers.users.map(authUser => {
      // Find matching profile
      const profile = (profiles as ProfileRecord[]).find(p => p.id === authUser.id);
      
      // Get the highest role (admin > editor > viewer)
      let highestRole = 'viewer';
      if (profile?.user_brand_permissions) {
        for (const permission of profile.user_brand_permissions) {
          if (permission.role === 'admin') {
            highestRole = 'admin';
            break;
          } else if (permission.role === 'editor' && highestRole !== 'admin') {
            highestRole = 'editor';
          }
        }
      }
      
      return {
        id: authUser.id,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
        email: authUser.email,
        avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        role: highestRole.charAt(0).toUpperCase() + highestRole.slice(1), // Capitalize role
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        brand_permissions: profile?.user_brand_permissions || []
      };
    });

    return NextResponse.json({ 
      success: true, 
      users: mergedUsers 
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching users');
  }
} 