import { NextResponse, NextRequest } from 'next/server';
import { withCorrelation } from '@/lib/observability/with-correlation';
import { timed } from '@/lib/observability/timer';
import { Product, EffectiveClaim, FinalClaimTypeEnum, getStackedClaimsForProduct } from '@/lib/claims-utils';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { ok } from '@/lib/http/response';

export const dynamic = "force-dynamic";

// Types for the new API response structure
interface MarketClaimOverrideInfo {
  overrideId?: string;
  isBlocked?: boolean;
  masterClaimIdItOverrides?: string;
  replacementClaimId?: string | null;
  replacementClaimText?: string | null;
  replacementClaimType?: 'allowed' | 'disallowed' | null;
}

interface ApiProductInfo {
  id: string;
  name: string;
}

interface ApiClaimTextInfo {
  text: string;
  // Future: Add other claim-specific details here if needed for row headers
}

interface MatrixCell {
  effectiveStatus: FinalClaimTypeEnum;
  effectiveClaimSourceLevel?: EffectiveClaim['source_level'];
  sourceMasterClaimId?: string | null;
  isActuallyMaster: boolean;
  activeOverride?: MarketClaimOverrideInfo | null;
  description?: string | null;
  isBlockedOverride?: boolean;
  isReplacementOverride?: boolean;
  originalMasterClaimIdIfOverridden?: string | null;
  // Store the original effective claim for more detailed popups/interactions on the frontend
  originalEffectiveClaimDetails?: EffectiveClaim | null; 
}

interface ClaimsMatrixApiResponseData {
  claimTextsAsRows: ApiClaimTextInfo[];
  productsAsCols: ApiProductInfo[];
  cellData: Record<string, Record<string, MatrixCell | null>>; // Keyed by claimText.text, then by product.id
}


export const GET = withCorrelation(withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const targetCountryCode = searchParams.get('countryCode');
    const limitRowsParam = Number(searchParams.get('limitRows') || '200');
    const limitRows = Number.isFinite(limitRowsParam) && limitRowsParam > 0 ? Math.min(limitRowsParam, 2000) : 200;
    const masterBrandIdFilter = searchParams.get('masterBrandId');

    if (isBuildPhase()) {
      console.log(`[API Claims Matrix GET] Build phase: returning empty structure.`);
      return ok({ claimTextsAsRows: [], productsAsCols: [], cellData: {} });
    }

    if (!targetCountryCode || typeof targetCountryCode !== 'string' || targetCountryCode.trim() === '') {
      return NextResponse.json({ success: false, error: 'countryCode query parameter is required.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch Products
    let productsQuery = supabase.from('products').select('id, name, description, master_brand_id');
    if (masterBrandIdFilter) {
      productsQuery = productsQuery.eq('master_brand_id', masterBrandIdFilter);
    }

    const { data: productsData, error: productsError } = await productsQuery.order('name');

    if (productsError) {
      console.error('[API Claims Matrix GET] Error fetching products:', productsError);
      return handleApiError(productsError, 'Failed to fetch products for the matrix.');
    }
    const validProductsData = (productsData || []).filter(p => p.master_brand_id !== null);
    const products: Product[] = validProductsData.map(p => ({ ...p, master_brand_id: p.master_brand_id as string }));

    if (products.length === 0) {
      return ok({ claimTextsAsRows: [], productsAsCols: [], cellData: {} });
    }

    const productsAsCols: ApiProductInfo[] = products.map(p => ({ id: p.id, name: p.name }));
    // 2. Use stacking logic per product to build claims rows and cells
    const effectiveByProduct = new Map<string, EffectiveClaim[]>();
    const allClaimTextsSet = new Set<string>();
    for (const p of products) {
      const eff = await getStackedClaimsForProduct(p.id, targetCountryCode);
      effectiveByProduct.set(p.id, eff);
      eff.forEach(ec => allClaimTextsSet.add((ec.claim_text || '').trim()));
    }
    let claimTextsAsRows: ApiClaimTextInfo[] = Array.from(allClaimTextsSet).sort().map(text => ({ text }));
    if (claimTextsAsRows.length > limitRows) claimTextsAsRows = claimTextsAsRows.slice(0, limitRows);

    const cellData: Record<string, Record<string, MatrixCell | null>> = {};
    for (const claimInfo of claimTextsAsRows) {
      const text = claimInfo.text;
      cellData[text] = {};
      for (const product of products) {
        const eff = effectiveByProduct.get(product.id) || [];
        const base = eff.find(ec => (ec.claim_text || '').trim() === text.trim()) || null;
        const cell: MatrixCell = base ? {
          effectiveStatus: base.final_claim_type,
          effectiveClaimSourceLevel: base.source_level,
          sourceMasterClaimId: base.original_master_claim_id_if_overridden || base.source_claim_id || null,
          isActuallyMaster: !!base.isActuallyMaster,
          activeOverride: base.source_level === 'override' ? {} : null,
          description: base.description || null,
          isBlockedOverride: (base as any).is_blocked_override || false,
          isReplacementOverride: (base as any).is_replacement_override || false,
          originalMasterClaimIdIfOverridden: base.original_master_claim_id_if_overridden || null,
          originalEffectiveClaimDetails: base,
        } : { effectiveStatus: 'none', isActuallyMaster: false, activeOverride: null, sourceMasterClaimId: null, originalEffectiveClaimDetails: null };
        cellData[text][product.id] = cell;
      }
    }


    const responseData: ClaimsMatrixApiResponseData = {
      claimTextsAsRows,
      productsAsCols,
      cellData,
    };

    return await timed('claims-matrix', async () => ok(responseData));

  } catch (error: unknown) {
    console.error(`[API Claims Matrix GET] Caught error:`, error);
    return handleApiError(error, 'An unexpected error occurred while fetching the claims matrix.');
  }
}));
