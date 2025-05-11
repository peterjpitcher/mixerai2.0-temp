import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { NextRequest } from 'next/server';

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data: contentTypes, error } = await supabase
      .from('content_types')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      data: contentTypes 
    });
  } catch (error: any) {
    return handleApiError(error, 'Error fetching content types');
  }
}); 