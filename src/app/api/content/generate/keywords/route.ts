import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';

import { handleApiError } from '@/lib/api-utils';
import { generateSuggestions } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { logContentGenerationAudit } from '@/lib/audit/content';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 6000;

const requestSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(MAX_CONTENT_LENGTH, `Content must be fewer than ${MAX_CONTENT_LENGTH} characters`),
  brand_id: z.string().uuid().optional(),
});

/**
 * POST: Generate keyword suggestions based on provided content.
 * Requires authentication.
 */
export const POST = withAuthAndCSRF(async (request: NextRequest, user: User): Promise<Response> => {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const rateLimitResult = await enforceContentRateLimits(request, user.id, body.brand_id);
    if ('type' in rateLimitResult) {
      return NextResponse.json(rateLimitResult.body, {
        status: rateLimitResult.status,
        headers: rateLimitResult.headers,
      });
    }
    const content = body.content.trim();

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
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`keywords generation: brand ${body.brand_id} not found or error fetching (${brandError?.message})`);
        }
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
    }

    const suggestions = await generateSuggestions('keywords', {
      content,
      brandContext: brandContextForSuggestions,
    });

    await logContentGenerationAudit({
      action: 'content_generate_keywords',
      userId: user.id,
      brandId: body.brand_id,
      metadata: {
        sourceLength: content.length,
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
