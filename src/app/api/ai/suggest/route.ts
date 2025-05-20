import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { generateTextCompletion } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Brand } from '@/types/models';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface SuggestionRequest {
  prompt: string;
  fieldType: string;
  formValues: Record<string, any>;
  brand_id?: string;
  options?: {
    maxLength?: number;
    format?: string;
  };
}

/**
 * POST: Generate suggestions for a field using AI
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body: SuggestionRequest = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
      return NextResponse.json({ success: false, error: 'A valid prompt is required' }, { status: 400 });
    }

    let userPrompt = body.prompt;
    console.log('[API /ai/suggest] Received original prompt:', userPrompt);
    console.log('[API /ai/suggest] Received brand_id:', body.brand_id);

    if (body.brand_id) {
      try {
        const supabase = createSupabaseAdminClient();
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('id', body.brand_id)
          .single<Brand>();

        if (brandError) {
          console.error(`[API /ai/suggest] Error fetching brand ${body.brand_id}:`, brandError.message);
          // Decide if to proceed with original prompt or error out
          // For now, proceeding with original prompt and logging the error.
        } else if (brand) {
          console.log('[API /ai/suggest] Successfully fetched brand data:', brand.name);
          // Perform interpolation
          userPrompt = userPrompt.replace(/\{\{brand\.name\}\}/g, brand.name || '');
          userPrompt = userPrompt.replace(/\{\{brand\.identity\}\}/g, brand.brand_identity || '');
          userPrompt = userPrompt.replace(/\{\{brand\.tone_of_voice\}\}/g, brand.tone_of_voice || '');
          userPrompt = userPrompt.replace(/\{\{brand\.guardrails\}\}/g, brand.guardrails || '');
          userPrompt = userPrompt.replace(/\{\{brand\.summary\}\}/g, brand.brand_summary || '');
          // For the {{brand}} placeholder, replace with the whole stringified brand object
          if (userPrompt.includes('{{brand}}')) {
             userPrompt = userPrompt.replace(/\{\{brand\}\}/g, JSON.stringify(brand, null, 2));
          }
          console.log('[API /ai/suggest] Interpolated prompt with brand data:', userPrompt);
        } else {
          console.warn(`[API /ai/suggest] Brand with ID ${body.brand_id} not found. Proceeding with original prompt.`);
        }
      } catch (e) {
        console.error('[API /ai/suggest] Exception during brand fetching/interpolation:', e);
        // Proceed with original prompt in case of an unexpected error during brand processing
      }
    }

    const systemPrompt = "You are a helpful assistant. Provide a concise suggestion based on the user's instructions. If the user asks for a title, it should be between 6 and 10 words long. If the user asks for a list, provide a comma-separated list.";
    
    // Log the final prompt being sent to AI, ensuring it does not get truncated in the logs
    console.log('[API /ai/suggest] Final user prompt being sent to generateTextCompletion (full):', userPrompt);

    // Using generateTextCompletion for suggestions
    const suggestion = await generateTextCompletion(systemPrompt, userPrompt, 250, 0.7); // Increased maxTokens for potentially longer interpolated prompts

    if (suggestion === null || suggestion.trim() === '') {
      return handleApiError(new Error('AI service failed to generate a suggestion or returned empty.'), 'Suggestion generation failed.', 500);
    }

    let finalSuggestion = suggestion.trim();
    // Remove leading and trailing double quotes if present
    if (finalSuggestion.startsWith('"') && finalSuggestion.endsWith('"')) {
      finalSuggestion = finalSuggestion.substring(1, finalSuggestion.length - 1);
    }
    // It's possible the AI might use single quotes too, though less common for titles
    if (finalSuggestion.startsWith("'") && finalSuggestion.endsWith("'")) {
        finalSuggestion = finalSuggestion.substring(1, finalSuggestion.length - 1);
    }

    return NextResponse.json({
      success: true, 
      suggestion: finalSuggestion,
    });

  } catch (error: any) {
    console.error('[API /ai/suggest] Error:', error);
    let errorMessage = 'Failed to generate suggestion';
    let statusCode = 500;

    if (error.message?.includes('OpenAI') || error.message?.includes('Azure') || error.message?.includes('AI service')) {
      errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('prompt is required')) {
      errorMessage = 'A valid prompt is required.';
      statusCode = 400; // Bad Request
    } else {
      errorMessage = error.message || errorMessage;
    }
    return handleApiError(new Error(errorMessage), 'Failed to generate suggestion.', statusCode);
  }
}); 