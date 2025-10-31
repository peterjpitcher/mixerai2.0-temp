import { NextRequest, NextResponse } from 'next/server';
import { transCreateContent } from '@/lib/azure/openai';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Json } from '@/types/supabase';
import { z } from 'zod';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';

const ContentTransCreationSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  sourceLanguage: z.string().min(2).max(10).optional(),
  brand_id: z.string().uuid(),
  batch_id: z.string().uuid().optional(),
  batch_sequence: z.number().int().nonnegative().optional(),
});

type ContentTransCreationRequest = z.infer<typeof ContentTransCreationSchema>;

export const POST = withAuthMonitoringAndCSRF(async (request: NextRequest, user) => {
  const supabaseAdmin = createSupabaseAdminClient();
  let historyEntryStatus: 'success' | 'failure' = 'success';
  let historyErrorMessage: string | undefined = undefined;
  let apiInputs: ContentTransCreationRequest | null = null;
  let apiOutputs: { transCreatedContent?: string; targetLanguage: string; targetCountry: string; error?: string } | null = null;
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    historyEntryStatus = 'failure';
    historyErrorMessage = 'Invalid JSON payload.';
    return NextResponse.json(
      { success: false, error: historyErrorMessage },
      { status: 400 }
    );
  }

  const bodyParse = ContentTransCreationSchema.safeParse(parsedBody);
  if (!bodyParse.success) {
    historyEntryStatus = 'failure';
    historyErrorMessage = 'Invalid request payload';
    return NextResponse.json(
      { success: false, error: historyErrorMessage, details: bodyParse.error.flatten() },
      { status: 400 }
    );
  }

  const data = bodyParse.data;
  apiInputs = data;

  // Role check: Only Global Admins or Editors can access this tool
  const userRole = user.user_metadata?.role;
  if (!(userRole === 'admin' || userRole === 'editor')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to access this tool.' },
      { status: 403 }
    );
  }

  const rateLimitCheck = await enforceContentRateLimits(request, user.id, data.brand_id);
  if (!('ok' in rateLimitCheck)) {
    historyEntryStatus = 'failure';
    historyErrorMessage = rateLimitCheck.body.error;
    apiOutputs = { error: historyErrorMessage, targetLanguage: '', targetCountry: '' };
    return NextResponse.json(rateLimitCheck.body, {
      status: rateLimitCheck.status,
      headers: rateLimitCheck.headers,
    });
  }

  try {
    try {
      const hasAccess = await userHasBrandAccess(supabaseAdmin, user, data.brand_id);
      if (!hasAccess) {
        historyEntryStatus = 'failure';
        historyErrorMessage = 'You do not have access to this brand.';
        return NextResponse.json(
          { success: false, error: historyErrorMessage },
          { status: 403 }
        );
      }
    } catch (error) {
      if (error instanceof BrandPermissionVerificationError) {
        historyEntryStatus = 'failure';
        historyErrorMessage = 'Unable to verify brand permissions.';
        return NextResponse.json(
          { success: false, error: historyErrorMessage },
          { status: 500 }
        );
      }
      throw error;
    }

    const { data: brandData, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('language, country')
      .eq('id', data.brand_id)
      .single();

    if (brandError || !brandData) {
      console.error(`Failed to fetch brand details for brand_id ${data.brand_id}:`, brandError);
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Failed to fetch brand details or brand not found.';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 404 }
      );
    }

    if (!brandData.language || !brandData.country) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Brand language and country are required for trans-creation and are missing for this brand.';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 400 }
      );
    }
    
    const sourceLanguage = data.sourceLanguage || 'en';
    
    const transCreatedResult = await transCreateContent(
      data.content,
      sourceLanguage,
      brandData.language,
      brandData.country
    );
    
    apiOutputs = {
      transCreatedContent: transCreatedResult.transCreatedContent,
      targetLanguage: brandData.language,
      targetCountry: brandData.country
    };

    return NextResponse.json({
      success: true,
      userId: user.id,
      sourceLanguage,
      targetLanguage: brandData.language,
      targetCountry: brandData.country,
      ...transCreatedResult
    });
  } catch (error: unknown) {
    let errorMessage = 'Failed to trans-create content. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || error.message.includes('AI service')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error("Content Trans-creation Error (internal):", error);
    historyEntryStatus = 'failure';
    historyErrorMessage = errorMessage;
    apiOutputs = { error: errorMessage, targetLanguage: '', targetCountry: '' };
    return handleApiError(new Error(errorMessage), 'Content Trans-creation Error', statusCode);
  } finally {
    // Log to tool_run_history in all cases (success or failure)
    try {
      if (apiInputs) {
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'content_transcreator',
            inputs: apiInputs as unknown as Json,
            outputs: ((apiOutputs as unknown as Json) || { error: historyErrorMessage || 'Unknown error before output generation' } as Json),
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: data.brand_id,
            batch_id: data.batch_id || null,
            batch_sequence: data.batch_sequence || null
        });
      } else {
        if (historyEntryStatus === 'failure' && historyErrorMessage) {
             await supabaseAdmin.from('tool_run_history').insert({
                user_id: user.id,
                tool_name: 'content_transcreator',
                inputs: { error: 'Failed to parse request or early error' } as unknown as Json,
                outputs: { error: historyErrorMessage } as unknown as Json,
                status: 'failure',
                error_message: historyErrorMessage,
                brand_id: null,
                batch_id: null,
                batch_sequence: null
            });
        }
      }
    } catch (logError) {
      console.error('[HistoryLoggingError] Failed to log run for content-transcreator:', logError);
    }
  }
}); 
