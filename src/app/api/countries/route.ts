import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Original GET logic, now to be wrapped by withAuth
async function getCountriesHandler() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Try to fetch from database first
    const { data, error } = await supabase
      .from('countries')
      .select('code, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      // If countries table doesn't exist, return a default list
      if (error.code === '42P01') { // Table does not exist
        console.warn('Countries table does not exist, returning default list');
        const defaultCountries = [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'CA', name: 'Canada' },
          { code: 'AU', name: 'Australia' },
          { code: 'DE', name: 'Germany' },
          { code: 'FR', name: 'France' },
          { code: 'IT', name: 'Italy' },
          { code: 'ES', name: 'Spain' },
          { code: 'NL', name: 'Netherlands' },
          { code: 'JP', name: 'Japan' },
          { code: 'CN', name: 'China' },
          { code: 'IN', name: 'India' },
          { code: 'BR', name: 'Brazil' },
          { code: 'MX', name: 'Mexico' },
          { code: 'KR', name: 'South Korea' },
        ];
        return NextResponse.json({ success: true, countries: defaultCountries }, {
          headers: {
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
      
      console.error('Error fetching countries:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, countries: data || [] }, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });

  } catch (error) {
    return handleApiError(error, 'Error fetching countries');
  }
}

// Export the wrapped handler
export const GET = withAuth(getCountriesHandler); 
