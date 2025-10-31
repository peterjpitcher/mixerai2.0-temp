import { NextResponse } from 'next/server';
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { recommendVettingAgencies } from '@/lib/vetting-agencies/recommendations';

export const dynamic = 'force-dynamic';

type RecommendRequestBody = {
  brandName?: string;
  countryCode?: string;
  languageCodes?: string[];
  categoryTags?: string[];
  brandSummary?: string | null;
  existingAgencyIds?: string[];
};

export const POST = withAdminAuthAndCSRF(async (request, _user) => {
  try {
    const body = (await request.json().catch(() => ({}))) as RecommendRequestBody;
    const brandName = body.brandName?.trim();
    const countryCode = body.countryCode?.trim();

    if (!brandName) {
      return NextResponse.json(
        { success: false, error: 'brandName is required' },
        { status: 400 },
      );
    }

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'countryCode is required' },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    let existingAgencyNames: string[] = [];
    if (Array.isArray(body.existingAgencyIds) && body.existingAgencyIds.length > 0) {
      const { data: existingRows, error: existingError } = await supabase
        .from('content_vetting_agencies')
        .select('name')
        .in('id', body.existingAgencyIds);

      if (existingError) {
        console.error(
          '[vetting-agency-recommend] Failed to lookup existing agencies',
          existingError,
        );
      } else if (existingRows) {
        existingAgencyNames = existingRows
          .map((row) => row?.name)
          .filter((name: string | null | undefined): name is string =>
            typeof name === 'string' && name.trim().length > 0,
          );
      }
    }

    const recommendation = await recommendVettingAgencies({
      supabaseClient: supabase,
      brandName,
      countryCode,
      languageCodes: Array.isArray(body.languageCodes) ? body.languageCodes : [],
      categoryTags: Array.isArray(body.categoryTags) ? body.categoryTags : [],
      brandSummary: body.brandSummary ?? null,
      existingAgencyNames,
    });

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to recommend vetting agencies');
  }
});
