import { NextResponse, NextRequest } from 'next/server';
import { getStackedClaimsForProduct, Claim } from '@/lib/claims-utils';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface StackedClaimsParams {
  id: string; // Product ID
}

// GET handler for fetching stacked claims for a product
export const GET = withAuth(async (req: NextRequest, user: User, { params }: { params: StackedClaimsParams }) => {
  try {
    const productId = params.id;
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get('countryCode');

    if (isBuildPhase()) {
        console.log(`[API Product Stacked Claims GET] Build phase: returning empty array for product ${productId}.`);
        return NextResponse.json({ success: true, isMockData: true, data: [] });
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is missing from the path.' }, 
        { status: 400 }
      );
    }

    if (!countryCode || typeof countryCode !== 'string' || countryCode.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'countryCode query parameter is required and must be a non-empty string.' }, 
        { status: 400 }
      );
    }

    // TODO: Permission check: Does the user have rights to view claims for this product/brand?
    // For now, allowing any authenticated user to proceed if they have the product ID.

    const stackedClaims: Claim[] = await getStackedClaimsForProduct(productId, countryCode);

    return NextResponse.json({ success: true, data: stackedClaims });

  } catch (error: any) {
    console.error(`[API Product Stacked Claims GET] Catched error for product ${params.id}:`, error);
    return handleApiError(error, 'An unexpected error occurred while fetching stacked claims.');
  }
}); 