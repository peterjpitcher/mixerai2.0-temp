import { NextRequest, NextResponse } from 'next/server';
import { transCreateContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

interface ContentTransCreationRequest {
  content: string;
  sourceLanguage?: string;
  brand_id: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  // Role check: Only Global Admins or Editors can access this tool
  const userRole = user.user_metadata?.role;
  if (!(userRole === 'admin' || userRole === 'editor')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to access this tool.' },
      { status: 403 }
    );
  }

  try {
    const data: ContentTransCreationRequest = await request.json();
    
    if (!data.content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!data.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required for trans-creation' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('language, country')
      .eq('id', data.brand_id)
      .single();

    if (brandError || !brandData) {
      console.error(`Failed to fetch brand details for brand_id ${data.brand_id}:`, brandError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch brand details or brand not found.' },
        { status: 404 }
      );
    }

    if (!brandData.language || !brandData.country) {
      return NextResponse.json(
        { success: false, error: 'Brand language and country are required for trans-creation and are missing for this brand.' },
        { status: 400 }
      );
    }
    
    const sourceLanguage = data.sourceLanguage || 'en';
    
    const transCreatedResult = await transCreateContent(
      data.content,
      sourceLanguage,
      brandData.language,
      brandData.country
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      sourceLanguage,
      targetLanguage: brandData.language,
      targetCountry: brandData.country,
      ...transCreatedResult
    });
  } catch (error: any) {
    let errorMessage = 'Failed to trans-create content. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429 || error.message.includes('AI service')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error("Content Trans-creation Error (internal):", error);
    return handleApiError(new Error(errorMessage), 'Content Trans-creation Error', statusCode);
  }
}); 