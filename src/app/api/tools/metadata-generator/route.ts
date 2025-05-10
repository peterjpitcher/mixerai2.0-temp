import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

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
    
    // Validate request data
    if (!data.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!data.brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(data.url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Fetch brand information if not provided in request
    let brandLanguage = data.brandLanguage;
    let brandCountry = data.brandCountry;
    let brandIdentity = data.brandIdentity;
    let toneOfVoice = data.toneOfVoice;
    let guardrails = data.guardrails;
    
    const supabase = createSupabaseAdminClient();
    
    if (!brandLanguage || !brandCountry || !brandIdentity || !toneOfVoice || !guardrails) {
      // Fetch brand details from the database
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('name, country, language, brand_identity, tone_of_voice, guardrails')
        .eq('id', data.brandId)
        .single();
        
      if (brandError) {
        console.error('Error fetching brand data:', brandError);
        return NextResponse.json(
          { error: 'Failed to fetch brand information' },
          { status: 500 }
        );
      }
      
      // Use brand data from database or defaults
      brandLanguage = brandLanguage || brandData.language || 'en';
      brandCountry = brandCountry || brandData.country || 'US';
      brandIdentity = brandIdentity || brandData.brand_identity || '';
      toneOfVoice = toneOfVoice || brandData.tone_of_voice || '';
      guardrails = guardrails || brandData.guardrails || '';
    }
    
    // Fetch webpage content to provide context
    let pageContent = '';
    try {
      pageContent = await fetchWebPageContent(data.url);
    } catch (fetchError) {
      console.warn('Could not fetch webpage content, proceeding without it:', fetchError);
    }
    
    // Generate metadata with brand context
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
    
    // Validate the generated metadata
    const validationResult = validateMetadata(generatedMetadata.metaTitle, generatedMetadata.metaDescription);

    if (!validationResult.isValid) {
      console.warn('Generated metadata failed validation:', validationResult.reason);
      // Return a 422 Unprocessable Entity status, indicating a validation error with the AI-generated content
      return NextResponse.json(
        { 
          success: false, 
          error: `Generated content validation failed: ${validationResult.reason}`,
          metaTitle: generatedMetadata.metaTitle, // Still return the generated content for context if needed
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
      keywords: [] // Maintain backwards compatibility
    });
  } catch (error: any) {
    console.error('Error generating metadata:', error);
    
    let errorMessage = 'Failed to generate metadata. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503; // Service Unavailable or 429 for rate limiting if distinguishable
      } else if ((error as any).status === 422) { // If it was our own validation error from validateMetadata
        errorMessage = error.message; // Use the specific message from validateMetadata
        statusCode = 422;
      } else {
        // For other errors, use the error message if available, otherwise a generic one
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: statusCode }
    );
  }
});

// Function to validate metadata length requirements
function validateMetadata(metaTitle: string, metaDescription: string): { 
  isValid: boolean; 
  reason?: string;
  titleLength?: number;
  descriptionLength?: number;
} {
  // Remove any character count annotations that the AI might include
  const cleanTitle = (metaTitle || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  const cleanDescription = (metaDescription || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
  
  const titleLength = cleanTitle?.length || 0;
  const descriptionLength = cleanDescription?.length || 0;
  
  // More lenient title validation (45-60 chars) since CMS will append brand name
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