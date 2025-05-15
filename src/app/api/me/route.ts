import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Use server client for route handlers
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth } from '@/lib/auth/route-handlers';

export const dynamic = "force-dynamic"; // Ensure fresh data on every request

// Define the expected structure of the user object we want to return
interface UserProfileResponse {
  id: string;
  email?: string;
  user_metadata?: { [key: string]: any }; // Supabase user_metadata
  brand_permissions?: Array<{
    brand_id: string; // Assuming brand_id will always be present if the permission exists
    role: string;
    brand?: { id: string; name: string } | null; // Brand itself could be null if join fails or brand deleted
  }>;
  // Add any other fields from your 'profiles' table you might want
  full_name?: string | null; // Allow null to match DB type
  job_title?: string | null; // Allow null
  company?: string | null;   // Allow null
  avatar_url?: string | null; // Allow null
}

export const GET = withRouteAuth(async (request: NextRequest, authUser: any) => {
  // authUser is the user object from Supabase Auth, provided by withRouteAuth
  if (!authUser || !authUser.id) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient(); // Use admin or server client as appropriate

    // 1. Get user's profile from the 'profiles' table (if you have one)
    // This is useful if user_metadata in auth.users doesn't have everything or you have a separate profiles table.
    let userProfileData: Partial<Pick<UserProfileResponse, 'full_name' | 'job_title' | 'company' | 'avatar_url'>> = {};
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, job_title, company, avatar_url') // Select fields you need from profiles
      .eq('id', authUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
      console.error('[API /me] Error fetching profile:', profileError);
      // Decide if this is critical. If profile is essential, throw error.
    }
    if (profile) {
      userProfileData = profile; // Direct assignment is fine if types match (string | null)
    }

    // 2. Get user's brand permissions from 'user_brand_permissions' table
    const { data: rawBrandPermissions, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select(`
        brand_id,
        role,
        brand:brands (id, name)
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
        brand: p.brand as { id: string; name: string } | null // Explicitly type the joined brand
    })).filter(p => p.brand_id != null) as UserProfileResponse['brand_permissions'];

    // Combine all data into the final user object
    const finalUserResponse: UserProfileResponse = {
      id: authUser.id,
      email: authUser.email,
      user_metadata: authUser.user_metadata || {},
      brand_permissions: typedBrandPermissions || [],
      full_name: userProfileData.full_name,
      job_title: userProfileData.job_title,
      company: userProfileData.company,
      // Ensure avatar_url has the DiceBear fallback if profile.avatar_url is null
      avatar_url: userProfileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
    };

    return NextResponse.json({ success: true, user: finalUserResponse });

  } catch (error) {
    return handleApiError(error, 'Error fetching user session information');
  }
}); 