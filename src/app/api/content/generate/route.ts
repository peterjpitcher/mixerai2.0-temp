import { NextRequest, NextResponse } from 'next/server';
import { generateContent, generateContentFromTemplate } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

type ContentType = "article" | "retailer_pdp" | "owned_pdp" | string;

interface ContentGenerationRequest {
  contentType: ContentType;
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
    
    if (!data.contentType || !data.brand?.name) {
      return NextResponse.json(
        { success: false, error: 'Content type and brand name are required' },
        { status: 400 }
      );
    }
    
    if (data.template && data.template.id) {
      try {
        const generatedContent = await generateContentFromTemplate(
          data.contentType as ContentType,
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
    
    if (data.contentType === 'article' && !data.input?.topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required for article content type' },
        { status: 400 }
      );
    }
    
    if (['retailer_pdp', 'owned_pdp'].includes(data.contentType) && !data.input?.productName) {
      return NextResponse.json(
        { success: false, error: 'Product name is required for PDP content types' },
        { status: 400 }
      );
    }
    
    let safeContentType: "article" | "retailer_pdp" | "owned_pdp";
    if (data.contentType === 'article' || data.contentType === 'retailer_pdp' || data.contentType === 'owned_pdp') {
      safeContentType = data.contentType;
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported content type: ${data.contentType}` },
        { status: 400 }
      );
    }
    
    const generatedContent = await generateContent(
      safeContentType,
      data.brand,
      data.input || {}
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      ...generatedContent
    });
  } catch (error) {
    return handleApiError(error, 'Failed to generate content');
  }
}); 