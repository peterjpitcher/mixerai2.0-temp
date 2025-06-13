import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const contentId = params.id;

  if (!contentId) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    const { data: versions, error } = await supabase
      .from('content_versions')
      .select(`
        *,
        reviewer:reviewer_id(id, full_name, avatar_url),
        content_json
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false }); // Or by version_number

    if (error) throw error;

    return NextResponse.json({ success: true, data: versions || [] });

  } catch (error: unknown) {
    return handleApiError(error, `Failed to fetch content versions for content ID: ${contentId}`);
  }
}); 