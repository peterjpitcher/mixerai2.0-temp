import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { generateTextCompletion } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

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

    const systemPrompt = "You are a helpful assistant. Provide a concise suggestion based on the user's instructions. If the user asks for a list, provide a comma-separated list.";
    const userPrompt = body.prompt;

    // Using generateTextCompletion for suggestions
    const suggestion = await generateTextCompletion(systemPrompt, userPrompt, 100, 0.7);

    if (suggestion === null || suggestion.trim() === '') {
      return handleApiError(new Error('AI service failed to generate a suggestion or returned empty.'), 'Suggestion generation failed.', 500);
    }

    return NextResponse.json({
      success: true, 
      suggestion: suggestion.trim(),
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