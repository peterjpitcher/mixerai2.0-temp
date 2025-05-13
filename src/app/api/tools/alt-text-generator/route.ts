import { NextRequest, NextResponse } from 'next/server';
import { generateAltText } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { extractCleanDomain } from '@/lib/utils/url-utils';
import { Tables } from '@/types/supabase';

interface AltTextGenerationRequest {
  imageUrl: string;
  brandId?: string;
  websiteUrlForBrandDetection?: string;
  brandLanguage?: string;
  brandCountry?: string;
  brandIdentity?: string;
  toneOfVoice?: string;
  guardrails?: string;
}

type BrandContextType = Tables<'brands'> | null;

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: AltTextGenerationRequest = await request.json();
    
    if (!data.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
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

    let brandContext: BrandContextType = null;
    const supabase = createSupabaseAdminClient();

    if (data.brandId) {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', data.brandId)
        .single();
      if (brandError) {
        console.warn(`[AltTextGen] Brand ID ${data.brandId} provided but not found: ${brandError.message}`);
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
          console.warn(`[AltTextGen] Error fetching brand by domain ${cleanDomain}: ${brandError.message}`);
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
      brand_id_used: brandContext?.id || null,
      brand_name_used: brandContext?.name || null,
      detection_source: data.brandId ? 'brand_id' : (data.websiteUrlForBrandDetection && brandContext ? 'url_detection' : 'none'),
      ...generatedAltText
    });
  } catch (error: any) {
    let errorMessage = 'Failed to generate alt text';
    let statusCode = 500;
    
    if (error.message?.includes('OpenAI') || error.message?.includes('Azure') || error.message?.includes('AI service') || (error as any).status === 429) {
      errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
      statusCode = 503;
    } else {
      errorMessage = error.message || errorMessage;
    }
    return handleApiError(new Error(errorMessage), 'Alt Text Generation Error', statusCode);
  }
}); 