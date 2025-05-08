import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata } from '@/lib/azure/openai';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';

interface MetadataGenerationRequest {
  url: string;
  brandId: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

// This is an open test endpoint not protected by authentication
export async function POST(request: NextRequest) {
  console.log("Test metadata generator API called");
  
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
    
    // Use provided brand information or defaults
    const brandLanguage = data.brandLanguage || 'en';
    const brandCountry = data.brandCountry || 'GB';
    const brandIdentity = data.brandIdentity || 'A food brand that helps home bakers succeed';
    const toneOfVoice = data.toneOfVoice || 'Helpful, friendly and supportive';
    const guardrails = data.guardrails || 'Keep content family-friendly';
    
    console.log("Using test brand data for generation:", {
      brandLanguage,
      brandCountry,
      brandIdentity: brandIdentity.substring(0, 30) + "..."
    });
    
    // Fetch webpage content to provide context
    let pageContent = '';
    try {
      pageContent = await fetchWebPageContent(data.url);
      console.log(`Successfully fetched content from URL (${pageContent.length} characters)`);
    } catch (fetchError) {
      console.warn('Could not fetch webpage content, proceeding without it:', fetchError);
    }
    
    // Generate metadata with brand context
    console.log("Calling generateMetadata...");
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
    
    console.log("Metadata generation successful");
    return NextResponse.json({
      success: true,
      url: data.url,
      ...generatedMetadata,
      keywords: []
    });
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metadata' 
      },
      { status: 500 }
    );
  }
}

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