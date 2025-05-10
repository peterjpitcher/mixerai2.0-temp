import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

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
  job_title?: string;
  company?: string;
}

// Sample fallback data for when DB connection fails during runtime
const getFallbackUsers = () => {
  return [
    {
      id: 'fallback-user-1',
      full_name: 'Fallback Admin',
      email: 'admin-fallback@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback-admin',
      role: 'Admin',
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      brand_permissions: [],
      is_current_user: false,
      job_title: 'System Admin',
      company: 'Fallback Inc.'
    },
    {
      id: 'fallback-user-2',
      full_name: 'Fallback Editor',
      email: 'editor-fallback@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback-editor',
      role: 'Editor',
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      brand_permissions: [],
      is_current_user: false,
      job_title: 'Content Editor',
      company: 'Fallback Inc.'
    }
  ];
};

/**
 * GET endpoint to retrieve all users with profile information
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock users during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: [
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
      
      // Debug user permissions
      console.log(`Processing user: ${authUser.email}`);
      if (profile?.user_brand_permissions) {
        console.log(`User: ${authUser.email}, Permissions:`, JSON.stringify(profile.user_brand_permissions));
      } else {
        console.log(`User: ${authUser.email}, No permissions found`);
      }
      
      // Get the highest role (admin > editor > viewer)
      let highestRole = 'viewer';
      if (profile?.user_brand_permissions && Array.isArray(profile.user_brand_permissions) && profile.user_brand_permissions.length > 0) {
        for (const permission of profile.user_brand_permissions) {
          if (permission && permission.role === 'admin') {
            highestRole = 'admin';
            console.log(`User: ${authUser.email}, Found admin role, setting highest role to admin`);
            break;
          } else if (permission && permission.role === 'editor' && highestRole !== 'admin') {
            highestRole = 'editor';
            console.log(`User: ${authUser.email}, Found editor role, setting highest role to editor`);
          }
        }
      }
      
      // Check if role might be coming from metadata as fallback
      if (highestRole === 'viewer' && authUser.user_metadata?.role) {
        const metadataRole = typeof authUser.user_metadata.role === 'string' ? 
          authUser.user_metadata.role.toLowerCase() : '';
        
        if (metadataRole === 'admin') {
          highestRole = 'admin';
          console.log(`User: ${authUser.email}, Found admin role in metadata, using that instead`);
        } else if (metadataRole === 'editor') {
          highestRole = 'editor';
          console.log(`User: ${authUser.email}, Found editor role in metadata, using that instead`);
        }
      }
      
      console.log(`User: ${authUser.email}, Final role: ${highestRole}`);
      
      return {
        id: authUser.id,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
        email: authUser.email,
        avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        job_title: profile?.job_title || authUser.user_metadata?.job_title || '',
        company: profile?.company || authUser.user_metadata?.company || '',
        role: highestRole.charAt(0).toUpperCase() + highestRole.slice(1), // Capitalize role
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        brand_permissions: profile?.user_brand_permissions || [],
        is_current_user: authUser.id === user.id // Flag to identify the current user
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: mergedUsers 
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback users data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        data: getFallbackUsers()
      });
    }
    return handleApiError(error, 'Error fetching users');
  }
}); 