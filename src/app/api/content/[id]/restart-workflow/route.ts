import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
  const contentId = params.id;

  const supabase = createSupabaseAdminClient();

  try {
    // 1. Fetch current content and its brand to check admin status
    const { data: currentContent, error: contentError } = await supabase
      .from('content')
      .select('*, brand:brands!inner(brand_admin_id)') // Ensure brand is fetched and has brand_admin_id
      .eq('id', contentId)
      .single();

    if (contentError) {
        if (contentError.code === 'PGRST116') { // Not found
            return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
        }
        throw contentError;
    }
    if (!currentContent) { // Should be caught by single() error, but as a safeguard
      return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
    }
    
    // Explicitly check if brand and brand_admin_id were loaded.
    // The !inner join in select should ensure brand is present if content is found, but good to be safe.
    if (!currentContent.brand || typeof currentContent.brand !== 'object' || !currentContent.brand.brand_admin_id) {
        return NextResponse.json({ success: false, error: 'Brand admin information not found for this content.' }, { status: 404 });
    }

    // 2. Verify user is the brand_admin_id for this content's brand
    if (currentContent.brand.brand_admin_id !== user.id) {
      return NextResponse.json({ success: false, error: 'User is not authorized to restart this workflow.' }, { status: 403 });
    }

    // 3. Verify content status is 'rejected'
    if (currentContent.status !== 'rejected') {
      return NextResponse.json({ success: false, error: 'Content must be in rejected status to restart workflow.' }, { status: 400 });
    }

    // 4. Update content to restart workflow
    const { data: updatedContent, error: updateError } = await supabase
      .from('content')
      .update({
        current_step: 0, // Reset to the first step (index 0)
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Optionally, create a content_version entry for this restart action.
    // Consider this for future enhancement if audit trail for restarts is needed.

    return NextResponse.json({ success: true, message: 'Workflow restarted successfully.', data: updatedContent });

  } catch (error: any) {
    return handleApiError(error, 'Error restarting workflow');
  }
}); 