import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';

interface ContentGenerationRequest {
  contentType: "article" | "retailer_pdp" | "owned_pdp";
  brand: {
    name: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
  };
  input: {
    topic?: string;
    keywords?: string[];
    productName?: string;
    productDescription?: string;
    additionalInstructions?: string;
  };
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: ContentGenerationRequest = await request.json();
    
    // Validate request data
    if (!data.contentType || !data.brand?.name) {
      return NextResponse.json(
        { error: 'Content type and brand name are required' },
        { status: 400 }
      );
    }
    
    // Additional validation based on content type
    if (data.contentType === 'article' && !data.input.topic) {
      return NextResponse.json(
        { error: 'Topic is required for article content type' },
        { status: 400 }
      );
    }
    
    if (['retailer_pdp', 'owned_pdp'].includes(data.contentType) && !data.input.productName) {
      return NextResponse.json(
        { error: 'Product name is required for PDP content types' },
        { status: 400 }
      );
    }
    
    // Generate content
    const generatedContent = await generateContent(
      data.contentType,
      data.brand,
      data.input
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id, // Include user ID for monitoring purposes
      ...generatedContent
    });
  } catch (error) {
    console.error('Error generating content:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate content' 
      },
      { status: 500 }
    );
  }
}); 