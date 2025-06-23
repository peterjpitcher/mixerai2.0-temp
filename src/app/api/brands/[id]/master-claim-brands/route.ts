import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET endpoint to fetch master claim brands linked to a specific brand
export const GET = withAuth(async (
  req: NextRequest,
  user,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const brandId = params.id;
    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Check if user has permission to view this brand
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      const { data: permission, error: permissionError } = await supabase
        .from('user_brand_permissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', brandId)
        .maybeSingle();

      if (permissionError) throw permissionError;
      if (!permission) {
        return NextResponse.json({ success: false, error: 'You do not have permission to view this brand.' }, { status: 403 });
      }
    }

    // Fetch master claim brands linked to this brand from the junction table
    const { data: links, error: linksError } = await supabase
      .from('brand_master_claim_brands')
      .select('master_claim_brand_id')
      .eq('brand_id', brandId);

    if (linksError) throw linksError;

    return NextResponse.json({ success: true, data: links || [] });

  } catch (error: unknown) {
    console.error('API error in /api/brands/[id]/master-claim-brands:', error);
    return handleApiError(error, 'Error fetching master claim brands for brand');
  }
});