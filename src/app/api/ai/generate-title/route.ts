import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { generateContentTitleFromContext } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface TitleGenerationRequest {
  contentBody: string;
  brand_id: string;
  topic?: string;      // Optional topic from template/form
  keywords?: string[]; // Optional keywords from template/form
}

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body: TitleGenerationRequest = await request.json();

    if (!body.contentBody) {
      return NextResponse.json({ success: false, error: 'contentBody is required' }, { status: 400 });
    }
    if (!body.brand_id) {
      return NextResponse.json({ success: false, error: 'brand_id is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('name, brand_identity, tone_of_voice, language, country')
      .eq('id', body.brand_id)
      .single();

    if (brandError || !brandData) {
      return handleApiError(brandError || new Error('Brand not found'), 'Failed to fetch brand details for title generation.', 404);
    }

    if (!brandData.language || !brandData.country) {
      return NextResponse.json(
        { success: false, error: 'Brand language and country are required for localized title generation and are missing for this brand.' },
        { status: 400 }
      );
    }

    const brandContext = {
      name: brandData.name,
      brand_identity: brandData.brand_identity,
      tone_of_voice: brandData.tone_of_voice,
      language: brandData.language,
      country: brandData.country,
      topic: body.topic,      // Pass through if provided
      keywords: body.keywords,  // Pass through if provided
    };

    const title = await generateContentTitleFromContext(body.contentBody, brandContext);

    return NextResponse.json({ success: true, title: title });

  } catch (error: any) {
    console.error('Error in generate-title API:', error);
    return handleApiError(error, 'Failed to generate content title');
  }
}); 