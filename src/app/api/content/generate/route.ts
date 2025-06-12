import { NextRequest, NextResponse } from 'next/server';
import { generateContentFromTemplate } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

// type ContentType = "article" | "retailer_pdp" | "owned_pdp" | string; // Removed

interface ContentGenerationRequest {
  brand_id: string;
  // Removed brand object from here
  input?: {
    topic?: string;
    keywords?: string[];
    productName?: string;
    productDescription?: string;
    additionalInstructions?: string;
    templateId?: string;
    templateFields?: Record<string, string>;
    product_context?: { productName: string; styledClaims: any };
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
    
    if (!data.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('name, brand_identity, tone_of_voice, guardrails, language, country')
      .eq('id', data.brand_id)
      .single();

    if (brandError || !brandData) {
      console.error('Error fetching brand:', brandError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch brand details or brand not found.' },
        { status: 404 }
      );
    }

    if (!brandData.language || !brandData.country) {
      return NextResponse.json(
        { success: false, error: 'Brand language and country are required for localized content generation and are missing for this brand.' },
        { status: 400 }
      );
    }
    
    if (data.template && data.template.id) {
      try {
        const brandInfoForGeneration = {
          name: brandData.name,
          brand_identity: brandData.brand_identity,
          tone_of_voice: brandData.tone_of_voice,
          guardrails: brandData.guardrails,
          language: brandData.language,
          country: brandData.country,
        };

        const finalInput = { ...data.input };
        if (data.input?.product_context && typeof data.input.product_context === 'string') {
          try {
            finalInput.product_context = JSON.parse(data.input.product_context);
          } catch (e) {
            console.error("Failed to parse product_context:", e);
            delete finalInput.product_context;
          }
        }

        const generatedContent = await generateContentFromTemplate(
          brandInfoForGeneration,
          data.template,
          finalInput
        );
        return NextResponse.json({
          success: true,
          userId: user.id,
          ...generatedContent
        });
      } catch (templateError) {
        console.error('Error during generateContentFromTemplate:', templateError);
        return handleApiError(templateError, 'Failed to generate content from template');
      }
    }
    
    return NextResponse.json(
        { success: false, error: 'Template ID is required for content generation.' },
        { status: 400 }
      );

  } catch (error) {
    console.error('Generic error in content generation POST handler:', error);
    return handleApiError(error, 'Failed to generate content');
  }
}); 