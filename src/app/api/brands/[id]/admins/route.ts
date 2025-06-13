import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client'; // Corrected path
import { handleApiError } from '@/lib/api-utils'; // Corrected path
import { User } from '@supabase/supabase-js';
import { withAuth } from '@/lib/auth/api-auth'; // Protect the route

interface BrandAdmin {
  id: string;
  full_name: string | null;
}

// Using withAuth to ensure the user is authenticated
export const GET = withAuth(async (
  req: NextRequest,
  currentUser: User, // User object provided by withAuth
  context?: unknown // Context parameter
) => {
  const { params } = context as { params: { id: string } };
  try {
    const brandId = params.id;
    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Fetch profiles that have 'admin' role for the specified brand_id
    // We join user_brand_permissions and filter by brand_id and role='admin'
    // Then we select the id and full_name from the profiles table.
    const { data: admins, error: queryError } = await supabase
      .from('user_brand_permissions')
      .select(`
        profiles (
          id,
          full_name
        )
      `)
      .eq('brand_id', brandId)
      .eq('role', 'admin');

    if (queryError) {
      console.error('Error fetching brand admins from Supabase:', queryError);
      throw queryError;
    }

    // The data structure will be [{ profiles: { id, full_name } }, ...]
    // We need to flatten it and ensure no null profiles are passed.
    const formattedAdmins: BrandAdmin[] = admins
      ? admins.map(item => item.profiles).filter(profile => profile !== null) as BrandAdmin[]
      : [];

    return NextResponse.json({ success: true, admins: formattedAdmins });

  } catch (error: unknown) {
    console.error('API error in /api/brands/[id]/admins:', error);
    return handleApiError(error, 'Error fetching brand administrators');
  }
}); 