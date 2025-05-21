import { NextRequest, NextResponse } from 'next/server';
import { transCreateContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Database, Json } from '@/types/supabase';

// In-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // Allow 10 requests per minute per IP

interface ContentTransCreationRequest {
  content: string;
  sourceLanguage?: string;
  brand_id: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  const supabaseAdmin = createSupabaseAdminClient();
  let historyEntryStatus: 'success' | 'failure' = 'success';
  let historyErrorMessage: string | undefined = undefined;
  let apiInputs: ContentTransCreationRequest | null = null;
  let apiOutputs: { transCreatedContent?: string; targetLanguage: string; targetCountry: string; error?: string } | null = null;
  const data: ContentTransCreationRequest = await request.json();
  apiInputs = data; // Capture inputs for logging

  // Role check: Only Global Admins or Editors can access this tool
  const userRole = user.user_metadata?.role;
  if (!(userRole === 'admin' || userRole === 'editor')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to access this tool.' },
      { status: 403 }
    );
  }

  // Rate limiting logic
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const now = Date.now();

  if (rateLimit.has(ip)) {
    const userRateLimit = rateLimit.get(ip)!;
    if (now - userRateLimit.timestamp > RATE_LIMIT_PERIOD) {
      // Reset count if period has passed
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else if (userRateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`[RateLimit] Blocked ${ip} for content-transcreator. Count: ${userRateLimit.count}`);
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Rate limit exceeded.';
      try {
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'content_transcreator',
            inputs: { error: 'Rate limit exceeded for initial request' } as unknown as Json,
            outputs: { error: 'Rate limit exceeded' } as unknown as Json,
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: data.brand_id
        } as Database['public']['Tables']['tool_run_history']['Insert']);
      } catch (logError) {
        console.error('[HistoryLoggingError] Failed to log rate limit error for content-transcreator:', logError);
      }
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    } else {
      userRateLimit.count += 1;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }

  try {
    if (!data.content) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Content is required';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 400 }
      );
    }
    
    if (!data.brand_id) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Brand ID is required for trans-creation';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    const { data: brandData, error: brandError } = await supabase
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
  } catch (error: any) {
    let errorMessage = 'Failed to trans-create content. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429 || error.message.includes('AI service')) {
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
            outputs: apiOutputs as unknown as Json || { error: historyErrorMessage || 'Unknown error before output generation' },
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: data.brand_id
        } as Database['public']['Tables']['tool_run_history']['Insert']);
      } else {
        if (historyEntryStatus === 'failure' && historyErrorMessage) {
             await supabaseAdmin.from('tool_run_history').insert({
                user_id: user.id,
                tool_name: 'content_transcreator',
                inputs: { error: 'Failed to parse request or early error' } as unknown as Json,
                outputs: { error: historyErrorMessage } as unknown as Json,
                status: 'failure',
                error_message: historyErrorMessage,
                brand_id: null
            } as Database['public']['Tables']['tool_run_history']['Insert']);
        }
      }
    } catch (logError) {
      console.error('[HistoryLoggingError] Failed to log run for content-transcreator:', logError);
    }
  }
}); 