import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { extractCleanDomain } from '@/lib/utils/url-utils';
import { Tables } from '@/types/supabase';

interface MetadataGenerationRequest {
  url: string;
  brandId?: string;
  websiteUrlForBrandDetection?: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

type BrandContextType = Tables<'brands'> | null;

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

    if (!data.brandId && !data.websiteUrlForBrandDetection) {
      return NextResponse.json(
        { success: false, error: 'Brand ID or website URL for brand detection is required' },
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
    
    let brandContext: BrandContextType = null;
    const supabase = createSupabaseAdminClient();
    
    if (data.brandId) {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', data.brandId)
        .single();
        
      if (brandError) {
        console.warn(`[MetadataGen] Brand ID ${data.brandId} provided but not found: ${brandError.message}`);
      } else {
        brandContext = brandData;
      }
    } else if (data.websiteUrlForBrandDetection) {
      const cleanDomain = extractCleanDomain(data.websiteUrlForBrandDetection);
      if (cleanDomain) {
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('normalized_website_domain', cleanDomain)
          .limit(1)
          .single();
        
        if (brandError && brandError.code !== 'PGRST116') {
          console.warn(`[MetadataGen] Error fetching brand by domain ${cleanDomain}: ${brandError.message}`);
        } else if (brandData) {
          brandContext = brandData;
        }
      }
    }
    
    const brandLanguage = data.brandLanguage || brandContext?.language || 'en';
    const brandCountry = data.brandCountry || brandContext?.country || 'US';
    const brandIdentity = data.brandIdentity || brandContext?.brand_identity || '';
    const toneOfVoice = data.toneOfVoice || brandContext?.tone_of_voice || '';
    const guardrails = data.guardrails || brandContext?.guardrails || '';
    
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
          validationDetails: validationResult,
          brand_id_used: brandContext?.id || null,
          brand_name_used: brandContext?.name || null
        },
        { status: 422 }
      );
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      url: data.url,
      brand_id_used: brandContext?.id || null,
      brand_name_used: brandContext?.name || null,
      detection_source: data.brandId ? 'brand_id' : (data.websiteUrlForBrandDetection && brandContext ? 'url_detection' : 'none'),
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