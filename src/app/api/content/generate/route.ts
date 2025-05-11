import { NextRequest, NextResponse } from 'next/server';
import { generateContentFromTemplate } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

// type ContentType = "article" | "retailer_pdp" | "owned_pdp" | string; // Removed

interface ContentGenerationRequest {
  // contentType: ContentType; // Removed
  brand: {
    name: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
  };
  input?: {
    topic?: string;
    keywords?: string[];
    productName?: string;
    productDescription?: string;
    additionalInstructions?: string;
    templateId?: string;
    templateFields?: Record<string, string>;
  };
  template?: {
    id: string;
    name: string;
    inputFields: Array<{
      id: string;
      name: string;
      type: string;
      value: string;
      aiPrompt?: string;
    }>;
    outputFields: Array<{
      id: string;
      name: string;
      type: string;
      aiPrompt?: string;
      aiAutoComplete?: boolean;
      useBrandIdentity?: boolean;
      useToneOfVoice?: boolean;
      useGuardrails?: boolean;
    }>;
  };
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: ContentGenerationRequest = await request.json();
    
    if (!data.brand?.name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    if (data.template && data.template.id) {
      try {
        const generatedContent = await generateContentFromTemplate(
          data.brand,
          data.template,
          data.input
        );
        return NextResponse.json({
          success: true,
          userId: user.id,
          ...generatedContent
        });
      } catch (templateError) {
        return handleApiError(templateError, 'Failed to generate content from template');
      }
    }
    
    // Legacy block removed. 
    // If execution reaches here, it means no template was provided.
    // Template-based generation is now the primary/only path.
    return NextResponse.json(
        { success: false, error: 'Template ID is required for content generation.' },
        { status: 400 }
      );

  } catch (error) {
    return handleApiError(error, 'Failed to generate content');
  }
}); 