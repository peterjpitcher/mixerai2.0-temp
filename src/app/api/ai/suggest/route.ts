import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { generateTextCompletion } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Brand } from '@/types/models';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { truncateGraphemeSafe, normaliseForLength, stripAIWrappers } from '@/lib/text/enforce-limit';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Zod schema for request validation
const SuggestionRequestSchema = z.object({
  prompt: z.string().min(1).trim(),
  fieldType: z.string().optional(),
  formValues: z.record(z.unknown()).optional(),
  brand_id: z.string().optional(),
  options: z.object({
    maxLength: z.preprocess(
      v => (typeof v === 'string' ? Number(v) : v),
      z.number().int().positive().optional()
    ),
    maxRows: z.preprocess(
      v => (typeof v === 'string' ? Number(v) : v),
      z.number().int().positive().optional()
    ),
    format: z.string().optional()
  }).optional(),
  context: z.object({
    templateFields: z.record(z.string()).optional()
  }).optional()
});

/**
 * POST: Generate suggestions for a field using AI
 */
export const POST = withAuthAndCSRF(async (request: NextRequest): Promise<Response> => {
  try {
    const rawBody = await request.json();
    
    // Validate request with Zod
    const parsed = SuggestionRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.log('[API /ai/suggest] Validation error:', parsed.error.flatten());
      return NextResponse.json(
        { success: false, error: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const body = parsed.data;

    let userPrompt = body.prompt;
    console.log('[API /ai/suggest] Received original prompt:', userPrompt);
    console.log('[API /ai/suggest] Received brand_id:', body.brand_id);
    console.log('[API /ai/suggest] Received formValues:', body.formValues);

    // First, interpolate any field variables from formValues
    if (body.formValues && typeof body.formValues === 'object') {
      Object.entries(body.formValues).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          // Replace {{fieldName}} patterns
          const fieldNamePattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
          userPrompt = userPrompt.replace(fieldNamePattern, String(value));
        }
      });
      console.log('[API /ai/suggest] Interpolated prompt with form values:', userPrompt);
    }

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
    
    // Clean up any remaining unreplaced variables by removing them or replacing with empty string
    // This prevents curly braces from appearing in the AI output
    userPrompt = userPrompt.replace(/\{\{[^}]+\}\}/g, (match) => {
      console.warn(`[API /ai/suggest] Unreplaced variable found: ${match}`);
      return ''; // Replace with empty string instead of leaving the curly braces
    });

    // Build system prompt with constraints if provided
    let systemPrompt = "You are a helpful assistant. Return plain text only with no quotes, no markdown, no explanations.";
    
    // Add maxLength constraint to system prompt if provided
    if (body.options?.maxLength && typeof body.options.maxLength === 'number') {
      systemPrompt += ` CRITICAL REQUIREMENT: Your response MUST be no more than ${body.options.maxLength} characters long. `;
      systemPrompt += `Do NOT exceed ${body.options.maxLength} characters under any circumstances. `;
      systemPrompt += `If your initial response is longer, truncate it to fit within ${body.options.maxLength} characters.`;
    } else if (body.fieldType === 'shortText') {
      systemPrompt += " For short text fields, keep your response brief and concise (under 100 characters).";
    }
    
    // Add row constraint if provided
    if (body.options?.maxRows && typeof body.options.maxRows === 'number') {
      systemPrompt += ` Use at most ${body.options.maxRows} lines. Do not include extra blank lines.`;
    }
    
    systemPrompt += " If the user asks for a title, it should be between 6 and 10 words long. If the user asks for a list, provide a comma-separated list.";
    
    // Log the final prompt being sent to AI, ensuring it does not get truncated in the logs
    console.log('[API /ai/suggest] Final user prompt being sent to generateTextCompletion (full):', userPrompt);

    // Using generateTextCompletion for suggestions
    const suggestion = await generateTextCompletion(systemPrompt, userPrompt, 250, 0.7); // Increased maxTokens for potentially longer interpolated prompts

    if (suggestion === null || suggestion.trim() === '') {
      return handleApiError(new Error('AI service failed to generate a suggestion or returned empty.'), 'Suggestion generation failed.', 500);
    }

    // Clean up AI response
    let finalSuggestion = stripAIWrappers(suggestion);
    finalSuggestion = normaliseForLength(finalSuggestion);
    
    // Apply constraints and track if truncation occurred
    let truncated = false;
    const truncationDetails: Record<string, number> = {};
    
    // Apply maxLength constraint with grapheme-safe truncation
    if (body.options?.maxLength && typeof body.options.maxLength === 'number') {
      const result = truncateGraphemeSafe(finalSuggestion, body.options.maxLength);
      if (result.truncated) {
        console.log(`[API /ai/suggest] Truncated from ${result.originalLength} to ${result.finalLength} characters`);
        truncated = true;
        truncationDetails.maxLength = body.options.maxLength;
        truncationDetails.originalLength = result.originalLength;
      }
      finalSuggestion = result.text;
    }
    
    // Apply maxRows constraint if provided
    if (body.options?.maxRows && typeof body.options.maxRows === 'number') {
      const { clampRows } = await import('@/lib/text/rows');
      const result = clampRows(finalSuggestion, body.options.maxRows);
      if (result.truncated) {
        console.log(`[API /ai/suggest] Truncated from ${result.originalRows} to ${result.rows} rows`);
        truncated = true;
        truncationDetails.maxRows = body.options.maxRows;
        truncationDetails.originalRows = result.originalRows;
      }
      finalSuggestion = result.text;
    }

    const response = NextResponse.json({
      success: true, 
      suggestion: finalSuggestion,
      truncated,
      ...(truncated && { truncationDetails }),
      maxLength: body.options?.maxLength,
      maxRows: body.options?.maxRows
    });
    
    // Add header to signal truncation
    if (truncated) {
      response.headers.set('x-suggestion-truncated', 'true');
    }
    
    return response;

  } catch (error: unknown) {
    console.error('[API /ai/suggest] Error:', error);
    let errorMessage = 'Failed to generate suggestion';
    let statusCode = 500;

    if (error instanceof Error && (error.message?.includes('OpenAI') || error.message?.includes('Azure') || error.message?.includes('AI service'))) {
      errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
      statusCode = 503; // Service Unavailable
    } else if (error instanceof Error && error.message?.includes('prompt is required')) {
      errorMessage = 'A valid prompt is required.';
      statusCode = 400; // Bad Request
    } else if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    }
    return handleApiError(new Error(errorMessage), 'Failed to generate suggestion.', statusCode);
  }
}); 