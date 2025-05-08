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
export async function POST(request: NextRequest) {
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
    let brandLanguage = data.brandLanguage || 'en';
    let brandCountry = data.brandCountry || 'GB';
    let brandIdentity = data.brandIdentity || 'A food brand that helps home bakers succeed';
    let toneOfVoice = data.toneOfVoice || 'Helpful, friendly and supportive';
    let guardrails = data.guardrails || 'Keep content family-friendly';
    
    // For testing, we're skipping the database lookup
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
    
    return NextResponse.json({
      success: true,
      userId: "test-user",
      url: data.url,
      ...generatedMetadata,
      keywords: [] // Maintain backwards compatibility
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

// Keep the original authenticated route
export const originalPOST = withAuthAndMonitoring(async (request: NextRequest, user) => {
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
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      url: data.url,
      ...generatedMetadata,
      keywords: [] // Maintain backwards compatibility
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
}); 