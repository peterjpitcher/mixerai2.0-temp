import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client'; // Import Supabase client
import { handleApiError } from '@/lib/api-utils'; // For consistent error handling
import { withAuth } from '@/lib/auth/api-auth';

// REMOVE PG POOL SETUP
// import { Pool } from 'pg';
// const pool = new Pool({ ... });

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define Supabase priority type again if not centrally available
type SupabaseVettingAgencyPriority = "High" | "Medium" | "Low" | null;

// Helper function to map Supabase priority strings to numbers
// Consistent with the one in /api/brands/[id]/route.ts
function mapSupabasePriorityToNumber(priority: SupabaseVettingAgencyPriority): number {
  switch (priority) {
    case "High": return 1;
    case "Medium": return 2;
    case "Low": return 3;
    default: return Number.MAX_SAFE_INTEGER; // Default for null or unexpected values
  }
}

interface VettingAgencyForApiResponse {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number; // Numeric priority for consistent sorting/display
  // Add original_priority_string if needed for any reason, but API typically uses numeric for sorting
  // original_priority_string: SupabaseVettingAgencyPriority; 
}

export const GET = withAuth(async (request: Request, user: any) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('content_vetting_agencies')
      .select('*')
      .order('country_code', { ascending: true })
      .order('priority', { ascending: true, nullsFirst: false }) // Treat High, Medium, Low correctly if mapped to numbers
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching content vetting agencies:', error);
      throw error;
    }

    const processedAgencies: VettingAgencyForApiResponse[] = data.map(agency => ({
      id: agency.id,
      name: agency.name,
      description: agency.description,
      country_code: agency.country_code,
      priority: mapSupabasePriorityToNumber(agency.priority as SupabaseVettingAgencyPriority),
      // original_priority_string: agency.priority // include if needed
    })).sort((a, b) => {
        // Primary sort by country_code
        if (a.country_code < b.country_code) return -1;
        if (a.country_code > b.country_code) return 1;
        // Secondary sort by numeric priority (High = 1, Medium = 2, Low = 3)
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        // Tertiary sort by name
        return (a.name || '').localeCompare(b.name || '');
    });


    return NextResponse.json({ success: true, data: processedAgencies });

  } catch (error: any) {
    return handleApiError(error, 'Error fetching content vetting agencies');
  }
}); 