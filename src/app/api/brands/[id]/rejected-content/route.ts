import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const brandId = params.id;

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!brandId) {
    return NextResponse.json({ success: false, error: 'Brand ID is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // 1. Verify user is the brand_admin_id for this brand
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id, name, brand_admin_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json({ success: false, error: brandError?.message || 'Brand not found.' }, { status: 404 });
    }

    if (brandData.brand_admin_id !== user.id) {
      return NextResponse.json({ success: false, error: 'User is not authorized to view rejected content for this brand.' }, { status: 403 });
    }

    // 2. Fetch rejected content for this brand
    const { data: rejectedContent, error: contentError } = await supabase
      .from('content')
      .select(`
        id,
        title,
        status,
        updated_at,
        template:content_templates(name, icon),
        workflow:workflows(name)
      `)
      .eq('brand_id', brandId)
      .eq('status', 'rejected')
      .order('updated_at', { ascending: false });

    if (contentError) throw contentError;

    return NextResponse.json({ success: true, data: rejectedContent || [] });

  } catch (error: unknown) {
    return handleApiError(error, `Failed to fetch rejected content for brand ID: ${brandId}`);
  }
}); 