import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { User } from '@supabase/supabase-js';
import { withAuth } from '@/lib/auth/api-auth';

// According to our plan, this endpoint will fetch products for a given brand.
// It will support pagination and searching.

export const GET = withAuth(async (
  req: NextRequest,
  currentUser: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const brandId = params.id;
    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Brand ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createSupabaseAdminClient();

    // Allow global admins to bypass the brand-specific permission check
    const isGlobalAdmin = currentUser.user_metadata?.role === 'admin';

    if (!isGlobalAdmin) {
      // First, check if the user has permission to view this brand.
      const { data: permission, error: permissionError } = await supabase
        .from('user_brand_permissions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('brand_id', brandId)
        .maybeSingle();

      if (permissionError) throw permissionError;
      if (!permission) {
        return NextResponse.json({ success: false, error: 'You do not have permission to view this brand.' }, { status: 403 });
      }
    }

    // Fetch the master brand link from the master_claim_brands table.
    // This is the correct way to link a brand to its products.
    const { data: masterBrandLink, error: masterBrandLinkError } = await supabase
      .from('master_claim_brands')
      .select('id') // This ID is the master_brand_id for the products table
      .eq('mixerai_brand_id', brandId) // We link using the brand's actual ID
      .single();

    if (masterBrandLinkError) throw masterBrandLinkError;
    
    if (!masterBrandLink) {
      // If there's no entry in master_claim_brands, then this brand has no products.
      return NextResponse.json({ success: true, products: [] });
    }

    const masterBrandId = masterBrandLink.id;

    // Now, fetch the products for that master_brand_id
    let query = supabase
      .from('products')
      .select('id, name')
      .eq('master_brand_id', masterBrandId);

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw productsError;
    }

    const response = NextResponse.json({ success: true, products: products || [] });
    // Set caching headers as planned
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    return response;

  } catch (error: unknown) {
    console.error('API error in /api/brands/[id]/products:', error);
    return handleApiError(error, 'Error fetching products for brand');
  }
}); 