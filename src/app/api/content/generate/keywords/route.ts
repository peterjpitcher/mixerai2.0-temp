import { NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';

import { handleApiError } from '@/lib/api-utils';
import { generateSuggestions } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { logContentGenerationAudit } from '@/lib/audit/content';

export const dynamic = 'force-dynamic';

interface RequestBody {
  content: string;
  brand_id?: string;
}

/**
 * POST: Generate keyword suggestions based on provided content.
 * Requires authentication.
 */
export const POST = withAuthAndCSRF(async (request: NextRequest, user: User): Promise<Response> => {
  try {
    const body: RequestBody = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'Content is required in the request body' },
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

      try {
        const hasAccess = await userHasBrandAccess(supabase, user, body.brand_id);
        if (!hasAccess) {
          return NextResponse.json(
            { success: false, error: 'You do not have access to this brand.' },
            { status: 403 }
          );
        }
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions. Please try again later.' },
            { status: 500 }
          );
        }
        throw error;
      }

      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('name, brand_identity, tone_of_voice, language, country')
        .eq('id', body.brand_id)
        .single();

      if (brandError || !brandData) {
        console.warn(`Keywords Gen: Brand with ID ${body.brand_id} not found or error fetching. Proceeding without brand context. Error: ${brandError?.message}`);
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
        console.warn('Keywords Gen: No brand_id provided. Generating generic suggestions.');
    }

    const suggestions = await generateSuggestions('keywords', {
      content: body.content,
      brandContext: brandContextForSuggestions,
    });

    await logContentGenerationAudit({
      action: 'content_generate_keywords',
      userId: user.id,
      brandId: body.brand_id,
      metadata: {
        sourceLength: body.content.length,
        suggestionCount: suggestions?.length ?? 0,
      }
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
    });

  } catch (error: unknown) {
    console.error('Error generating keywords:', error);
    if (error instanceof Error && error.message && error.message.includes('API request failed')) {
        return handleApiError(error, 'AI service failed to generate keywords', 503);
    }
    return handleApiError(error, 'Failed to generate keywords');
  }
}); 
