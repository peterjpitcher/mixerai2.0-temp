import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Json } from '@/types/supabase';
import { z } from 'zod';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';
 // TODO: Uncomment when types are regenerated

const MAX_URLS_PER_REQUEST = 5;

const MetadataGenerationSchema = z.object({
  urls: z
    .array(z.string().min(1))
    .min(1, 'At least one URL is required')
    .max(MAX_URLS_PER_REQUEST, `A maximum of ${MAX_URLS_PER_REQUEST} URLs can be processed at once`),
  language: z.string().min(2).max(10).optional(),
  processBatch: z.boolean().optional(),
  brand_id: z.string().uuid().optional(),
});

type MetadataGenerationRequest = z.infer<typeof MetadataGenerationSchema>;

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
export const POST = withAuthMonitoringAndCSRF(async (request: NextRequest, user) => {
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

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch (parseError) {
    console.error('[MetadataGen] Failed to parse request body:', parseError);
    historyEntryStatus = 'failure';
    historyErrorMessage = 'Invalid JSON payload.';
    return NextResponse.json(
      { success: false, error: historyErrorMessage },
      { status: 400 }
    );
  }

  try {
    const parsedBody = MetadataGenerationSchema.safeParse(requestBody);
    if (!parsedBody.success) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Invalid request payload';
      return NextResponse.json(
        { success: false, error: historyErrorMessage, details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsedBody.data;
    apiInputs = data;

    const rateLimitCheck = await enforceContentRateLimits(request, user.id, data.brand_id ?? null);
    if (!('ok' in rateLimitCheck)) {
      historyEntryStatus = 'failure';
      historyErrorMessage = rateLimitCheck.body.error;
      apiOutputs = { results: [] as MetadataResultItem[] };
      return NextResponse.json(rateLimitCheck.body, {
        status: rateLimitCheck.status,
        headers: rateLimitCheck.headers,
      });
    }

    let brandLanguage: string | undefined;
    let brandCountry: string | undefined;
    let baseBrandContext = {
      brandIdentity: '',
      toneOfVoice: '',
      guardrails: '',
    };

    if (data.brand_id) {
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
        .select('language, country, brand_identity, tone_of_voice, guardrails')
        .eq('id', data.brand_id)
        .single();

      if (brandError || !brandData) {
        historyEntryStatus = 'failure';
        historyErrorMessage = 'Failed to fetch brand details or brand not found.';
        return NextResponse.json(
          { success: false, error: historyErrorMessage },
          { status: 404 }
        );
      }

      if (!brandData.language || !brandData.country) {
        historyEntryStatus = 'failure';
        historyErrorMessage = 'Brand language and country are required for metadata generation and are missing for this brand.';
        return NextResponse.json(
          { success: false, error: historyErrorMessage },
          { status: 400 }
        );
      }

      brandLanguage = brandData.language;
      brandCountry = brandData.country;
      baseBrandContext = {
        brandIdentity: brandData.brand_identity ?? '',
        toneOfVoice: brandData.tone_of_voice ?? '',
        guardrails: brandData.guardrails ?? '',
      };
    }

    const targetLanguage = data.language?.trim() || brandLanguage || 'en';
    const targetCountry = brandCountry || 'US';

    const results: MetadataResultItem[] = [];

    for (let i = 0; i < data.urls.length; i++) {
      const url = data.urls[i];
      try {
        // Validate that URL can be parsed (fetchWebPageContent performs additional checks)
        new URL(url);

        let pageContent = '';
        try {
          pageContent = await fetchWebPageContent(url);
        } catch (fetchError) {
          console.warn(`[MetadataGen] Failed to fetch content for URL ${url}: ${(fetchError as Error).message}`);
        }

        const generatedMetadata = await generateMetadata(
          url,
          targetLanguage,
          targetCountry,
          {
            ...baseBrandContext,
            pageContent,
          }
        );

        results.push({
          url,
          metaTitle: generatedMetadata.metaTitle,
          metaDescription: generatedMetadata.metaDescription,
          keywords: [],
        });
      } catch (error: unknown) {
        console.error(`[MetadataGen] Error processing URL ${url}:`, error);
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Failed to generate metadata for this URL.',
        });
        historyEntryStatus = 'failure';
        if (!historyErrorMessage) historyErrorMessage = 'One or more URLs failed metadata generation.';
      }
    }

    apiOutputs = { results };

    if (results.some(r => r.error)) {
      historyEntryStatus = 'failure';
      if (!historyErrorMessage) historyErrorMessage = 'One or more URLs failed to generate metadata.';
    } else {
      historyEntryStatus = 'success';
    }

    return NextResponse.json({
      success: historyEntryStatus === 'success',
      userId: user.id,
      results,
      ...(historyEntryStatus === 'failure' && historyErrorMessage && { error: historyErrorMessage })
    });

  } catch (error: unknown) {
    console.error('[MetadataGen] Global error in POST handler:', error);
    historyEntryStatus = 'failure';
    historyErrorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (!apiInputs) {
      apiInputs = { urls: [], language: 'unknown', processBatch: false } as MetadataGenerationRequest;
    }
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
            inputs: apiInputs as unknown as Json,
            outputs: ((apiOutputs as unknown as Json) || { error: historyErrorMessage || 'Unknown error before output generation' } as Json),
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: apiInputs?.brand_id ?? null,
            batch_id: batchId,
            batch_sequence: batchId ? 1 : null
        });
      } else {
        if (historyEntryStatus === 'failure' && historyErrorMessage) {
             await supabaseAdmin.from('tool_run_history').insert({
                user_id: user.id,
                tool_name: 'metadata_generator',
                inputs: { error: 'Failed to parse request or early error' } as unknown as Json,
                outputs: { error: historyErrorMessage } as unknown as Json,
                status: 'failure',
                error_message: historyErrorMessage,
                brand_id: null
            });
        }
      }
    } catch (logError) {
      console.error('[HistoryLoggingError] Failed to log run for metadata-generator:', logError);
    }
  }
}); 
