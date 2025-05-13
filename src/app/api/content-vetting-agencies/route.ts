import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client'; // Import Supabase client
import { handleApiError } from '@/lib/api-utils'; // For consistent error handling

// REMOVE PG POOL SETUP
// import { Pool } from 'pg';
// const pool = new Pool({ ... });

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient(); // Create Supabase client instance
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get('country_code');

  try {
    let query = supabase
      .from('content_vetting_agencies') // Use the correct table name from your Supabase schema
      .select('id, name, description, country_code, priority');

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    // Apply ordering
    if (countryCode) {
      query = query.order('priority', { ascending: true }).order('name', { ascending: true });
    } else {
      query = query.order('country_code', { ascending: true })
                   .order('priority', { ascending: true })
                   .order('name', { ascending: true });
    }

    const { data: agencies, error } = await query;

    if (error) {
      console.error('[API_CONTENT_VETTING_AGENCIES_GET_SUPABASE_ERROR]', error);
      throw error; // Let handleApiError manage the response
    }

    return NextResponse.json({ success: true, data: agencies }); // Changed key to 'data' for consistency

  } catch (error) {
    // Use a consistent error handling utility if available, or refine this
    console.error('[API_CONTENT_VETTING_AGENCIES_GET_ERROR]', error);
    return handleApiError(error, 'Failed to fetch content vetting agencies');
  }
} 