import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { generateContentTitleFromContext } from '@/lib/azure/openai';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { extractCleanDomain } from '@/lib/utils/url-utils';
import { Tables } from '@/types/supabase';

export const dynamic = 'force-dynamic';

interface TitleGenerationRequest {
  contentBody: string;
  brand_id?: string;
  websiteUrlForBrandDetection?: string;
  topic?: string;       // Optional topic from template/form
  keywords?: string[];  // Optional keywords from template/form
}

interface AIBrandContext {
    name: string;
    brand_identity: string | null;
    tone_of_voice: string | null;
    language: string;
    country: string;
    topic?: string | null;
    keywords?: string[] | null;
}

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body: TitleGenerationRequest = await request.json();

    if (!body.contentBody) {
      return NextResponse.json({ success: false, error: 'contentBody is required' }, { status: 400 });
    }
    if (!body.brand_id && !body.websiteUrlForBrandDetection) {
      return NextResponse.json({ success: false, error: 'brand_id or websiteUrlForBrandDetection is required' }, { status: 400 });
    }

    let brandForContext: Tables<'brands'> | null = null;
    const supabase = createSupabaseAdminClient();

    if (body.brand_id) {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', body.brand_id)
        .single();
      if (brandError) {
        console.warn(`[GenerateTitle] Brand ID ${body.brand_id} provided but not found: ${brandError.message}`);
      } else {
        brandForContext = brandData;
      }
    } else if (body.websiteUrlForBrandDetection) {
      const cleanDomain = extractCleanDomain(body.websiteUrlForBrandDetection);
      if (cleanDomain) {
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('normalized_website_domain', cleanDomain)
          .limit(1)
          .single();
        if (brandError && brandError.code !== 'PGRST116') {
          console.warn(`[GenerateTitle] Error fetching brand by domain ${cleanDomain}: ${brandError.message}`);
        } else if (brandData) {
          brandForContext = brandData;
        }
      }
    }

    if (!brandForContext) {
      return handleApiError(new Error('Brand could not be determined from the provided ID or URL.'), 'Brand not found for title generation.', 404);
    }
    
    if (!brandForContext.language || !brandForContext.country) {
      return NextResponse.json(
        { success: false, error: 'Brand language and country are required for localized title generation and are missing for the determined brand.' },
        { status: 400 }
      );
    }

    const aiBrandContext: AIBrandContext = {
      name: brandForContext.name,
      brand_identity: brandForContext.brand_identity,
      tone_of_voice: brandForContext.tone_of_voice,
      language: brandForContext.language,
      country: brandForContext.country,
      topic: body.topic,      
      keywords: body.keywords,  
    };

    const title = await generateContentTitleFromContext(body.contentBody, aiBrandContext);

    return NextResponse.json({
      success: true, 
      title: title,
      brand_id_used: brandForContext?.id || null,
      brand_name_used: brandForContext?.name || null,
      detection_source: body.brand_id ? 'brand_id' : (body.websiteUrlForBrandDetection && brandForContext ? 'url_detection' : 'none')
    });

  } catch (error: any) {
    console.error('Error in generate-title API:', error);
    let errorMessage = 'Failed to generate content title';
    let statusCode = 500;
    if (error.message?.includes('OpenAI') || error.message?.includes('Azure') || error.message?.includes('AI service') || (error as any).status === 429) {
      errorMessage = 'The AI service is currently busy or unavailable. Please try again later.';
      statusCode = 503;
    } else {
        errorMessage = error.message || errorMessage;
    }
    return handleApiError(new Error(errorMessage), 'Failed to generate content title', statusCode);
  }
}); 