import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Use server client for route handlers
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic"; // Ensure fresh data on every request

// Define the expected structure of the user object we want to return
interface UserProfileResponse {
  id: string;
  email?: string;
  user_metadata?: { 
    role?: string; // Role is an optional property within user_metadata, expected from authUser
    [key: string]: unknown; 
  };
  brand_permissions?: Array<{
    brand_id: string; // Assuming brand_id will always be present if the permission exists
    role: string;
    brand?: { id: string; name: string; master_claim_brand_id?: string | null; } | null; // Brand itself could be null if join fails or brand deleted
  }>;
  // Add any other fields from your 'profiles' table you might want
  full_name?: string | null; // Allow null to match DB type
  job_title?: string | null; // Allow null
  company?: string | null;   // Allow null
  avatar_url?: string | null; // Allow null
}

export const GET = withRouteAuth(async (request: NextRequest, authUser: User) => {
  // authUser is the user object from Supabase Auth, provided by withRouteAuth
  if (!authUser || !authUser.id) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient(); // Use admin or server client as appropriate

    let userProfileDataFromDb: { 
      full_name?: string | null; 
      job_title?: string | null; 
      company?: string | null; 
      avatar_url?: string | null; 
    } | null = null;

    const { data: profileResponse, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, job_title, company, avatar_url') 
      .eq('id', authUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('[API /me] Error fetching profile:', profileError);
    } else if (profileResponse) { // Assign if no critical error and profileResponse is truthy
        userProfileDataFromDb = profileResponse;
    }

    // 2. Get user's brand permissions from 'user_brand_permissions' table
    const { data: rawBrandPermissions, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select(`
        brand_id,
        role,
        brand:brands (id, name, master_claim_brand_id)
      `)
      .eq('user_id', authUser.id);

    if (permissionsError) {
      console.error('[API /me] Error fetching brand permissions:', permissionsError);
      // Decide if this is critical. For navigation, it might be.
      throw permissionsError; 
    }

    // Ensure brand_permissions are correctly typed and filter out any with null brand_id if necessary
    const typedBrandPermissions = (rawBrandPermissions || []).map(p => ({
        ...p,
        brand_id: p.brand_id as string, // Asserting brand_id is a string, as it's a FK
        brand: p.brand as { id: string; name: string; master_claim_brand_id?: string | null; } | null // Explicitly type the joined brand
    })).filter(p => p.brand_id != null) as UserProfileResponse['brand_permissions'];

    // Combine all data into the final user object
    const finalUserResponse: UserProfileResponse = {
      id: authUser.id,
      email: authUser.email,
      user_metadata: authUser.user_metadata || {},
      brand_permissions: typedBrandPermissions || [],
      full_name: userProfileDataFromDb?.full_name,
      job_title: userProfileDataFromDb?.job_title,
      company: userProfileDataFromDb?.company,
      avatar_url: userProfileDataFromDb?.avatar_url || authUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
    };

    return NextResponse.json({ success: true, user: finalUserResponse });

  } catch (error) {
    return handleApiError(error, 'Error fetching user session information');
  }
}); 