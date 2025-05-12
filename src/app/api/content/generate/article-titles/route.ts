import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { generateSuggestions } from '@/lib/azure/openai';

export const dynamic = 'force-dynamic';

interface RequestBody {
  topic: string;
  brandContext?: {
    name?: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
  };
}

/**
 * POST: Generate article title suggestions based on a topic.
 * Requires authentication.
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body: RequestBody = await request.json();

    if (!body.topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required in the request body' },
        { status: 400 }
      );
    }

    const suggestions = await generateSuggestions('article-titles', {
      topic: body.topic,
      brandContext: body.brandContext,
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
    });

  } catch (error: any) {
    // Specific check for AI service errors (e.g., 503)
    // This might need refinement based on actual errors thrown by generateSuggestions
    if (error.message && error.message.includes('API request failed')) {
        return handleApiError(error, 'AI service failed to generate titles', 503);
    }
    return handleApiError(error, 'Failed to generate article titles');
  }
}); 