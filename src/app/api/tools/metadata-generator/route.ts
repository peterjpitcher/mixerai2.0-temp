import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

interface MetadataGenerationRequest {
  url: string;
  brandId: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

// Temporarily expose a direct handler for testing
// export async function POST(request: NextRequest) { ... } // Content of this function is removed for brevity

// Keep the original authenticated route - RENAMING to POST
export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: MetadataGenerationRequest = await request.json();
    
    if (!data.url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!data.brandId) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    try {
      new URL(data.url);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    let brandLanguage = data.brandLanguage;
    let brandCountry = data.brandCountry;
    let brandIdentity = data.brandIdentity;
    let toneOfVoice = data.toneOfVoice;
    let guardrails = data.guardrails;
    
    const supabase = createSupabaseAdminClient();
    
    if (!brandLanguage || !brandCountry || !brandIdentity || !toneOfVoice || !guardrails) {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('name, country, language, brand_identity, tone_of_voice, guardrails')
        .eq('id', data.brandId)
        .single();
        
      if (brandError) {
        return handleApiError(brandError, 'Failed to fetch brand information');
      }
      if (!brandData) {
        return NextResponse.json(
            { success: false, error: 'Brand not found for the provided Brand ID' }, 
            { status: 404 }
        );
      }
      
      brandLanguage = brandLanguage || brandData.language || 'en';
      brandCountry = brandCountry || brandData.country || 'US';
      brandIdentity = brandIdentity || brandData.brand_identity || '';
      toneOfVoice = toneOfVoice || brandData.tone_of_voice || '';
      guardrails = guardrails || brandData.guardrails || '';
    }
    
    let pageContent = '';
    try {
      pageContent = await fetchWebPageContent(data.url);
    } catch (fetchError) {
      // console.warn removed. This error is non-critical for generation to proceed.
      // In a production system, this might be logged to a monitoring service.
    }
    
    const generatedMetadata = await generateMetadata(
      data.url,
      brandLanguage,
      brandCountry,
      {
        brandIdentity,
        toneOfVoice,
        guardrails,
        pageContent
      }
    );
    
    const validationResult = validateMetadata(generatedMetadata.metaTitle, generatedMetadata.metaDescription);

    if (!validationResult.isValid) {
      // console.warn removed
      return NextResponse.json(
        { 
          success: false, 
          error: `Generated content validation failed: ${validationResult.reason}`,
          metaTitle: generatedMetadata.metaTitle,
          metaDescription: generatedMetadata.metaDescription,
          titleLength: validationResult.titleLength,
          descriptionLength: validationResult.descriptionLength,
          validationDetails: validationResult
        },
        { status: 422 }
      );
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      url: data.url,
      ...generatedMetadata,
      keywords: [] // Retained for now as per note: "Maintain backwards compatibility"
    });
  } catch (error: any) {
    // console.error removed
    let errorMessage = 'Failed to generate metadata. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429 || error.message.includes('AI service')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else if ((error as any).status === 422 || error.message.includes('Generated content validation failed')) {
        errorMessage = error.message;
        statusCode = 422;
      } else if (error.message.includes('Failed to fetch brand information') || error.message.includes('Brand not found')){
        statusCode = (error as any).status || 404; // Use status from error if available for brand not found
        errorMessage = error.message;
      } else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return handleApiError(new Error(errorMessage), 'Metadata Generation Error', statusCode);
  }
});

// Function to validate metadata length requirements
function validateMetadata(metaTitle: string, metaDescription: string): { 
  isValid: boolean; 
  reason?: string;
  titleLength?: number;
  descriptionLength?: number;
} {
  const cleanTitle = (metaTitle || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  const cleanDescription = (metaDescription || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  
  const titleLength = cleanTitle?.length || 0;
  const descriptionLength = cleanDescription?.length || 0;
  
  if (titleLength < 45 || titleLength > 60) {
    return { 
      isValid: false, 
      reason: `Meta title length (${titleLength}) is outside the allowed range (45-60 characters). Note that CMS will append brand name.`,
      titleLength,
      descriptionLength
    };
  }
  
  if (descriptionLength < 150 || descriptionLength > 160) {
    return { 
      isValid: false, 
      reason: `Meta description length (${descriptionLength}) is outside the required range (150-160 characters)`,
      titleLength,
      descriptionLength
    };
  }
  
  return { isValid: true, titleLength, descriptionLength };
} 