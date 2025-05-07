import { NextRequest, NextResponse } from 'next/server';
import { generateAltText } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

interface AltTextGenerationRequest {
  imageUrl: string;
  brandId: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: AltTextGenerationRequest = await request.json();
    
    // Validate request data
    if (!data.imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }
    
    if (!data.brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    // Make sure we have a valid URL
    try {
      new URL(data.imageUrl);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 }
      );
    }
    
    // Fetch brand information if not provided in request
    let brandLanguage = data.brandLanguage;
    let brandCountry = data.brandCountry;
    let brandIdentity = data.brandIdentity;
    let toneOfVoice = data.toneOfVoice;
    let guardrails = data.guardrails;
    
    if (!brandLanguage || !brandCountry || !brandIdentity || !toneOfVoice || !guardrails) {
      // Fetch brand details from the database
      const supabase = createSupabaseAdminClient();
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
    
    // Generate alt text with brand context
    const generatedAltText = await generateAltText(
      data.imageUrl,
      brandLanguage,
      brandCountry,
      {
        brandIdentity,
        toneOfVoice,
        guardrails
      }
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      imageUrl: data.imageUrl,
      ...generatedAltText
    });
  } catch (error) {
    console.error('Error generating alt text:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate alt text' 
      },
      { status: 500 }
    );
  }
}); 