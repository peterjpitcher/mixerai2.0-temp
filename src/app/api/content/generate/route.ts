import { NextRequest, NextResponse } from 'next/server';
import { generateContent, generateContentFromTemplate } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';

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
    }>;
  };
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: ContentGenerationRequest = await request.json();
    console.log('Content generation request received:', JSON.stringify(data, null, 2));
    
    // Validate request data
    if (!data.contentType || !data.brand?.name) {
      return NextResponse.json(
        { error: 'Content type and brand name are required' },
        { status: 400 }
      );
    }
    
    // Check if this is a template-based request
    if (data.template && data.template.id) {
      console.log('Processing template-based content generation');
      console.log('Template ID:', data.template.id);
      console.log('Template output fields:', data.template.outputFields);
      
      try {
        // Generate content using the template
        const generatedContent = await generateContentFromTemplate(
          data.contentType as ContentType,
          data.brand,
          data.template,
          data.input
        );
        
        // Return structured response with template field values
        return NextResponse.json({
          success: true,
          userId: user.id,
          ...generatedContent
        });
      } catch (templateError) {
        console.error('Template-based generation failed:', templateError);
        
        // Fall back to standard generation if template fails
        console.log('Falling back to standard content generation');
        
        if (!data.input?.topic && data.template.inputFields) {
          // Try to extract a topic from template fields
          const titleField = data.template.inputFields.find(f => 
            f.id === 'title' || f.name.toLowerCase().includes('title')
          );
          
          if (titleField && titleField.value) {
            console.log('Using template title field as topic:', titleField.value);
            if (!data.input) data.input = {};
            data.input.topic = titleField.value;
          }
        }
      }
    }
    
    // Standard validation for non-template requests
    if (data.contentType === 'article' && !data.input?.topic) {
      return NextResponse.json(
        { error: 'Topic is required for article content type' },
        { status: 400 }
      );
    }
    
    if (['retailer_pdp', 'owned_pdp'].includes(data.contentType) && !data.input?.productName) {
      return NextResponse.json(
        { error: 'Product name is required for PDP content types' },
        { status: 400 }
      );
    }
    
    // Generate content using standard method
    console.log('Using standard content generation');
    
    // Convert content type to a type that generateContent accepts
    let safeContentType: "article" | "retailer_pdp" | "owned_pdp";
    if (data.contentType === 'article' || data.contentType === 'retailer_pdp' || data.contentType === 'owned_pdp') {
      safeContentType = data.contentType;
    } else {
      // Default to article as fallback
      console.log(`Unknown content type "${data.contentType}", defaulting to "article"`);
      safeContentType = 'article';
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
    console.error('Error generating content:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}); 