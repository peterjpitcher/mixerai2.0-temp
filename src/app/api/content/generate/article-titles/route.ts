import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { generateSuggestions } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = 'force-dynamic';

interface RequestBody {
  topic: string;
  brand_id?: string;
}

/**
 * POST: Generate article title suggestions based on a topic.
 * Requires authentication.
 */
export const POST = withAuthAndCSRF(async (request: NextRequest): Promise<Response> => {
  try {
    const body: RequestBody = await request.json();

    if (!body.topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required in the request body' },
        { status: 400 }
      );
    }

    let brandContextForSuggestions: {
      name?: string;
      brand_identity?: string | null;
      tone_of_voice?: string | null;
      language: string;
      country: string;
    } | undefined = undefined;

    if (body.brand_id) {
      const supabase = createSupabaseAdminClient();
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('name, brand_identity, tone_of_voice, language, country')
        .eq('id', body.brand_id)
        .single();

      if (brandError || !brandData) {
        console.warn(`Article Titles Gen: Brand with ID ${body.brand_id} not found or error fetching. Proceeding without brand context. Error: ${brandError?.message}`);
      } else {
        if (!brandData.language || !brandData.country) {
          return NextResponse.json(
            { success: false, error: 'Brand language and country are required for localized suggestions and are missing for this brand.' },
            { status: 400 }
          );
        }
        brandContextForSuggestions = {
          name: brandData.name,
          brand_identity: brandData.brand_identity,
          tone_of_voice: brandData.tone_of_voice,
          language: brandData.language,
          country: brandData.country,
        };
      }
    } else {
        console.warn('Article Titles Gen: No brand_id provided. Generating generic suggestions.');
    }

    const suggestions = await generateSuggestions('article-titles', {
      topic: body.topic,
      brandContext: brandContextForSuggestions,
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
    });

  } catch (error: unknown) {
    console.error('Error generating article titles:', error);
    if (error instanceof Error && error.message && error.message.includes('API request failed')) {
        return handleApiError(error, 'AI service failed to generate titles', 503);
    }
    return handleApiError(error, 'Failed to generate article titles');
  }
}); 