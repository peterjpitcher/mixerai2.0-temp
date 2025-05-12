import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { generateSuggestions } from '@/lib/azure/openai';

export const dynamic = 'force-dynamic';

interface RequestBody {
  content: string;
  brandContext?: {
    name?: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
  };
}

/**
 * POST: Generate keyword suggestions based on provided content.
 * Requires authentication.
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body: RequestBody = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'Content is required in the request body' },
        { status: 400 }
      );
    }

    const suggestions = await generateSuggestions('keywords', {
      content: body.content,
      brandContext: body.brandContext,
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
    });

  } catch (error: any) {
    // Specific check for AI service errors (e.g., 503)
    if (error.message && error.message.includes('API request failed')) {
        return handleApiError(error, 'AI service failed to generate keywords', 503);
    }
    return handleApiError(error, 'Failed to generate keywords');
  }
}); 