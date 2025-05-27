import { NextRequest, NextResponse } from 'next/server';
import { getStackedClaimsForProduct } from '@/lib/claims-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client'; // Corrected path
import { withAuth } from '@/lib/auth/api-auth'; // Corrected path
import { User } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/api-utils'; // Added missing import

interface RouteParams {
  productId: string;
}

export const GET = withAuth(async (req: NextRequest, user: User, { params }: { params: RouteParams }) => {
  const { productId } = params;
  const { searchParams } = new URL(req.url);
  const countryCode = searchParams.get('countryCode');

  if (!productId) {
    return NextResponse.json({ success: false, error: 'Product ID is required.' }, { status: 400 });
  }

  if (!countryCode) {
    return NextResponse.json({ success: false, error: 'countryCode query parameter is required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient(); // Create client once

  try {
    // --- Permission Check Start ---
    const globalRole = user?.user_metadata?.role;
    let hasPermission = globalRole === 'admin';

    if (!hasPermission) {
      // Fetch the product to get its master_brand_id for permission validation
      // @ts-ignore
      const { data: productData, error: productFetchError } = await supabase
        .from('products')
        .select('master_brand_id')
        .eq('id', productId)
        .single();

      if (productFetchError) {
        if (productFetchError.code === 'PGRST116') { // Not found
          return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }
        console.error(`[API /products/${productId}/stacked-claims] Error fetching product for permission check:`, productFetchError);
        return handleApiError(productFetchError, 'Failed to verify product existence for permissions.');
      }

      if (!productData || !productData.master_brand_id) {
        return NextResponse.json({ success: false, error: 'Product not found or not associated with a master claim brand.' }, { status: 404 });
      }

      const productMasterBrandId = productData.master_brand_id;

      // Now fetch the master_claim_brand to get its mixerai_brand_id
      // @ts-ignore
      const { data: masterClaimBrandData, error: mcbError } = await supabase
        .from('master_claim_brands')
        .select('id, mixerai_brand_id')
        .eq('id', productMasterBrandId)
        .single();
      
      if (mcbError) {
        console.error(`[API /products/${productId}/stacked-claims] Error fetching master_claim_brand ${productMasterBrandId} for permission check:`, mcbError);
        return handleApiError(mcbError, 'Failed to verify brand linkage for permissions.');
      }

      if (!masterClaimBrandData || !masterClaimBrandData.mixerai_brand_id) {
        // This product's master_claim_brand is not linked to a main MixerAI brand, so non-admins cannot have permission.
        // Or, master_claim_brand itself not found, which would be an integrity issue if productData.master_brand_id was valid.
        // hasPermission remains false
      } else {
        const coreBrandId = masterClaimBrandData.mixerai_brand_id;
        // @ts-ignore
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('user_brand_permissions')
          .select('brand_id, role') // Select necessary fields
          .eq('user_id', user.id)
          .eq('brand_id', coreBrandId); // Check against the core MixerAI brand_id

        if (permissionsError) {
          console.error(`[API /products/${productId}/stacked-claims] Error fetching user_brand_permissions for user ${user.id}, core_brand_id ${coreBrandId}:`, permissionsError);
          // Potentially critical, but for now, let hasPermission remain false if error occurs
        } else if (permissionsData && permissionsData.length > 0) {
          hasPermission = true; // User has some role on the core MixerAI brand linked to the product's master_claim_brand
        }
      }
    }

    if (!hasPermission) {
      console.warn(`[API /products/${productId}/stacked-claims] User ${user.id} (global role: ${globalRole}) access denied to stacked claims for product ${productId}.`);
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view claims for this product.' },
        { status: 403 }
      );
    }
    // --- Permission Check End ---

    // getStackedClaimsForProduct creates its own admin client, so no need to pass one here.
    const effectiveClaims = await getStackedClaimsForProduct(productId, countryCode);

    console.log("--- Effective Claims from getStackedClaimsForProduct --- প্রোডাক্ট:", productId, "দেশ:", countryCode);
    console.log(JSON.stringify(effectiveClaims, null, 2)); // Pretty print the JSON
    console.log("-----------------------------------------------------");

    // getStackedClaimsForProduct is designed to return [] on error or if no claims, 
    // so checking for !effectiveClaims might be redundant if it never returns null/undefined.
    // However, it's a safe check.
    if (!effectiveClaims) { 
        return NextResponse.json({ success: false, error: 'Failed to retrieve stacked claims (unexpected null/undefined result).' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: effectiveClaims });

  } catch (error: any) {
    console.error(`[API /products/${productId}/stacked-claims] Error:`, error);
    let errorMessage = 'An unexpected error occurred while fetching stacked claims.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}); 