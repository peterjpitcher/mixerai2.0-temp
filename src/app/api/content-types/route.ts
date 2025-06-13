import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve all content types.
 * Requires authentication.
 */
export const GET = withAuth(async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: contentTypes, error } = await supabase
      .from('content_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching content types:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: contentTypes,
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch content types');
  }
}); 