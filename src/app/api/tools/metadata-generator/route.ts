import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
// import { Database, Json } from '@/types/supabase';
 // TODO: Uncomment when types are regenerated

// In-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // Allow 10 requests per minute per IP

interface MetadataGenerationRequest {
  urls: string[];
  language?: string;
  processBatch?: boolean;
}

// Define the result item type matching the frontend
interface MetadataResultItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}

// Temporarily expose a direct handler for testing
// export async function POST(request: NextRequest) { ... } // Content of this function is removed for brevity

// Keep the original authenticated route - RENAMING to POST
export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  const supabaseAdmin = createSupabaseAdminClient();
  let historyEntryStatus: 'success' | 'failure' = 'success';
  let historyErrorMessage: string | undefined = undefined;
  let apiInputs: MetadataGenerationRequest | null = null;
  let apiOutputs: { results: MetadataResultItem[] } | null = null;

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
      console.warn(`[RateLimit] Blocked ${ip} for metadata-generator. Count: ${userRateLimit.count}`);
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Rate limit exceeded.';
      try {
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'metadata_generator',
            inputs: { error: 'Rate limit exceeded for initial request' },
            outputs: { error: 'Rate limit exceeded' },
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: null
        } as any); // TODO: Type as Database['public']['Tables']['tool_run_history']['Insert'] when types are regenerated
      } catch (logError) {
        console.error('[HistoryLoggingError] Failed to log rate limit error for metadata-generator:', logError);
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
    const data: MetadataGenerationRequest = await request.json();
    apiInputs = data; // Capture inputs for logging
    
    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'An array of URLs is required';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 400 }
      );
    }

    const results: MetadataResultItem[] = [];
    const requestedLanguage = data.language || 'en';

    // Process URLs with appropriate delays to avoid rate limiting
    for (let i = 0; i < data.urls.length; i++) {
      const url = data.urls[i];
      try {
        new URL(url);

        const brandCountry = 'US';
        const brandContext = {
          brandIdentity: '',
          toneOfVoice: '',
          guardrails: '',
        };
        
        let pageContent = '';
        try {
          pageContent = await fetchWebPageContent(url);
        } catch (fetchError) {
          console.warn(`[MetadataGen] Failed to fetch content for URL ${url}: ${(fetchError as Error).message}`);
        }
        
        // Add delay between URLs to avoid rate limiting (except for the first URL)
        if (i > 0) {
          console.log(`[Delay] Metadata Gen: Waiting 2 seconds before processing next URL...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const generatedMetadata = await generateMetadata(
          url,
          requestedLanguage,
          brandCountry,
          {
            ...brandContext,
            pageContent
          }
        );
        
        results.push({
          url,
          metaTitle: generatedMetadata.metaTitle,
          metaDescription: generatedMetadata.metaDescription,
          keywords: [], // generateMetadata doesn't return keywords
        });

      } catch (error: unknown) {
        console.error(`[MetadataGen] Error processing URL ${url}:`, error);
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Failed to generate metadata for this URL.',
        });
        historyEntryStatus = 'failure'; // Mark overall run as failure if any URL fails
        if (!historyErrorMessage) historyErrorMessage = 'One or more URLs failed metadata generation.';
      }
    }
    
    apiOutputs = { results }; // Capture outputs for logging

    // Determine final history status based on individual URL results
    if (results.some(r => r.error)) {
        historyEntryStatus = 'failure';
        if (!historyErrorMessage) historyErrorMessage = 'One or more URLs failed to generate metadata.';
    } else {
        historyEntryStatus = 'success';
    }

    return NextResponse.json({
      success: historyEntryStatus === 'success', // Reflect overall success
      userId: user.id,
      results,
      ...(historyEntryStatus === 'failure' && historyErrorMessage && { error: historyErrorMessage })
    });

  } catch (error: unknown) {
    console.error('[MetadataGen] Global error in POST handler:', error);
    historyEntryStatus = 'failure';
    historyErrorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (!apiInputs) apiInputs = { urls: [], language: 'unknown' };
    apiOutputs = { results: [{ url: 'unknown', error: historyErrorMessage }] };
    // Note: handleApiError already returns a NextResponse, so we don't return it directly here.
    // The finally block will still execute.
    return handleApiError(new Error(historyErrorMessage), 'Metadata Generation Error', 500);
  } finally {
    // Log to tool_run_history in all cases (success or failure)
    try {
      if (apiInputs) {
        // Generate a batch_id if processBatch is true and there are multiple URLs
        const batchId = (apiInputs.processBatch && apiInputs.urls.length > 1) 
          ? crypto.randomUUID() 
          : null;

        // For batch processing, create a single history entry with all URLs
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'metadata_generator',
            inputs: apiInputs as any, // TODO: Type as Json when types are regenerated
            outputs: apiOutputs as any || { error: historyErrorMessage || 'Unknown error before output generation' }, // TODO: Type as Json when types are regenerated
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: null,
            batch_id: batchId,
            batch_sequence: batchId ? 1 : null
        } as any); // TODO: Type as Database['public']['Tables']['tool_run_history']['Insert'] when types are regenerated
      } else {
        if (historyEntryStatus === 'failure' && historyErrorMessage) {
             await supabaseAdmin.from('tool_run_history').insert({
                user_id: user.id,
                tool_name: 'metadata_generator',
                inputs: { error: 'Failed to parse request or early error' } as any, // TODO: Type as Json when types are regenerated
                outputs: { error: historyErrorMessage } as any, // TODO: Type as Json when types are regenerated
                status: 'failure',
                error_message: historyErrorMessage,
                brand_id: null
            } as any); // TODO: Type as Database['public']['Tables']['tool_run_history']['Insert'] when types are regenerated
        }
      }
    } catch (logError) {
      console.error('[HistoryLoggingError] Failed to log run for metadata-generator:', logError);
    }
  }
}); 