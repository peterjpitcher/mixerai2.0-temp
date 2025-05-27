import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
// Ensure your environment variables are correctly set up
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Check environment variables.");
  // Depending on strictness, you might throw an error or handle this case
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Original GET logic, now to be wrapped by withAuth
async function getCountriesHandler(request: NextRequest, user: User) {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching countries:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data });

  } catch (e: any) {
    console.error('Unexpected error in GET /api/countries handler:', e);
    return NextResponse.json({ success: false, error: e.message || 'An unexpected server error occurred' }, { status: 500 });
  }
}

// Export the wrapped handler
export const GET = withAuth(getCountriesHandler); 