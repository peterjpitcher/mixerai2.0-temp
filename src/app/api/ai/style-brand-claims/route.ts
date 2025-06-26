import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { formatClaimsDirectly } from '@/lib/claims-formatter';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

type Claim = {
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

// Function to fetch all claims related to a master claim brand
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | undefined, countryCode: string | undefined): Promise<Claim[]> {
  const { data, error } = await supabase.rpc('get_all_claims_for_master_brand', {
    master_brand_id_param: masterClaimBrandId,
    product_id_param: productId,
    country_code_param: countryCode
  });

  if (error) {
    console.error('Error fetching all brand claims:', error);
    throw new Error('Failed to fetch claims for the brand.');
  }

  return data as Claim[];
}

// Custom sort function for claims
function sortClaims(a: Claim, b: Claim): number {
  // 1. Level order: product > ingredient > brand
  const levelOrder = { product: 1, ingredient: 2, brand: 3 };
  const aLevel = levelOrder[a.level];
  const bLevel = levelOrder[b.level];
  if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }

  // 2. Market specificity: specific market > all countries
  const allCountriesCode = '__ALL_COUNTRIES__'; 
  const aIsGlobal = a.country_code === allCountriesCode;
  const bIsGlobal = b.country_code === allCountriesCode;
  if (aIsGlobal !== bIsGlobal) {
    return aIsGlobal ? 1 : -1;
  }

  return 0;
}

async function styleBrandClaimsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterClaimBrandId, productId, countryCode } = body;

    if (!masterClaimBrandId || typeof masterClaimBrandId !== 'string') {
      return NextResponse.json({ success: false, error: 'Master Claim Brand ID must be a string.' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();

    // 1. Fetch all claims
    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, countryCode);

    if (allClaims.length === 0) {
      const { data: brandData } = await supabase.from('master_claim_brands').select('name').eq('id', masterClaimBrandId).single();
      return NextResponse.json({
        success: true,
        brandName: brandData?.name || 'Unknown Brand',
        styledClaims: [],
        message: 'No claims found for the selected criteria.'
      });
    }

    // 2. Sort claims to establish precedence
    const sortedClaims = allClaims.sort(sortClaims);

    // 3. Use all claims without deduplication to preserve exact database values
    // Note: Keeping all claims as requested in issue #107
    const allClaimsToDisplay = sortedClaims;

    // Get brand and product names for the introductory sentence
    const { data: brandData } = await supabase
      .from('master_claim_brands')
      .select('name')
      .eq('id', masterClaimBrandId)
      .single();
    
    let productName: string | undefined;
    if (productId) {
      const { data: productData } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      productName = productData?.name;
    }

    // Format claims directly without AI
    const formattedClaims = formatClaimsDirectly(
      allClaimsToDisplay.map(claim => ({
        id: claim.claim_text, // Use text as ID since we don't have actual IDs
        claim_text: claim.claim_text,
        claim_type: claim.claim_type,
        level: claim.level.charAt(0).toUpperCase() + claim.level.slice(1), // Capitalize level
        country_code: claim.country_code,
        priority: 0 // No priority info in current structure
      })),
      productName,
      brandData?.name
    );

    // Log for debugging
    console.log('Formatted claims without AI:', {
      brandName: brandData?.name,
      productName,
      totalClaims: allClaimsToDisplay.length
    });

    return NextResponse.json({
      success: true,
      brandName: brandData?.name || 'Unknown Brand',
      styledClaims: formattedClaims,
      rawClaimsForAI: allClaimsToDisplay.map(claim => ({
        text: claim.claim_text,
        type: claim.claim_type,
        level: claim.level,
        market: claim.country_code
      }))
    });

  } catch (error: unknown) {
    console.error('Error in /api/ai/style-brand-claims handler:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }, { status: 500 });
  }
}

export const POST = withAuthAndCSRF(styleBrandClaimsHandler); 