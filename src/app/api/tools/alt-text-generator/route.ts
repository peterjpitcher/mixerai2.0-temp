import { NextRequest, NextResponse } from 'next/server';
import { generateAltText } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

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
    
    if (!data.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
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
      new URL(data.imageUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid image URL format' },
        { status: 400 }
      );
    }
    
    let brandLanguage = data.brandLanguage;
    let brandCountry = data.brandCountry;
    let brandIdentity = data.brandIdentity;
    let toneOfVoice = data.toneOfVoice;
    let guardrails = data.guardrails;
    
    if (!brandLanguage || !brandCountry || !brandIdentity || !toneOfVoice || !guardrails) {
      const supabase = createSupabaseAdminClient();
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
  } catch (error: any) {
    let errorMessage = 'Failed to generate alt text';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429 || error.message.includes('AI service')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
        statusCode = 503;
      } else if (error.message.includes('Failed to fetch brand information') || error.message.includes('Brand not found')){
        statusCode = (error as any).status || 404; 
        errorMessage = error.message;
      }else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return handleApiError(new Error(errorMessage), 'Alt Text Generation Error', statusCode);
  }
}); 