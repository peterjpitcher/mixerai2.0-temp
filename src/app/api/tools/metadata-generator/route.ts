import { NextRequest, NextResponse } from 'next/server';
import { generateMetadata, generateMetadataFromContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

interface MetadataGenerationRequest {
  url?: string;
  contentId?: string;
  brandId: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: MetadataGenerationRequest = await request.json();
    
    // Validate request data
    if (!data.url && !data.contentId) {
      return NextResponse.json(
        { error: 'Either URL or Content ID is required' },
        { status: 400 }
      );
    }

    if (!data.brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    // If URL is provided, validate it
    if (data.url) {
      try {
        new URL(data.url);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
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
    
    let generatedMetadata;
    
    // Handle URL-based metadata generation
    if (data.url) {
      // Fetch webpage content to provide context
      let pageContent = '';
      try {
        pageContent = await fetchWebPageContent(data.url);
      } catch (fetchError) {
        console.warn('Could not fetch webpage content, proceeding without it:', fetchError);
      }
      
      // Generate metadata with brand context
      generatedMetadata = await generateMetadata(
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
    } 
    // Handle content ID-based metadata generation
    else if (data.contentId) {
      // Fetch content from the database
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('title, body')
        .eq('id', data.contentId)
        .single();
        
      if (contentError) {
        console.error('Error fetching content data:', contentError);
        return NextResponse.json(
          { error: 'Failed to fetch content information' },
          { status: 500 }
        );
      }
      
      if (!contentData) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }
      
      // Generate metadata from content
      generatedMetadata = await generateMetadataFromContent(
        contentData.title,
        contentData.body,
        brandLanguage,
        brandCountry,
        {
          brandIdentity,
          toneOfVoice,
          guardrails
        }
      );
      
      // Save the generated metadata back to the content item
      const { error: updateError } = await supabase
        .from('content')
        .update({
          meta_title: generatedMetadata.metaTitle,
          meta_description: generatedMetadata.metaDescription
        })
        .eq('id', data.contentId);
        
      if (updateError) {
        console.warn('Failed to update content with generated metadata:', updateError);
      }
      
      return NextResponse.json({
        success: true,
        userId: user.id,
        contentId: data.contentId,
        ...generatedMetadata
      });
    }
    
    // If we somehow reach here (should not happen due to initial validation)
    return NextResponse.json(
      { error: 'No valid source (URL or Content ID) provided' },
      { status: 400 }
    );
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