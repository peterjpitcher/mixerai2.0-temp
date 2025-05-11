import { NextRequest, NextResponse } from 'next/server';
import { transCreateContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

interface ContentTransCreationRequest {
  content: string;
  sourceLanguage?: string;
  targetLanguage: string;
  targetCountry: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: ContentTransCreationRequest = await request.json();
    
    if (!data.content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!data.targetLanguage) {
      return NextResponse.json(
        { success: false, error: 'Target language is required' },
        { status: 400 }
      );
    }
    
    if (!data.targetCountry) {
      return NextResponse.json(
        { success: false, error: 'Target country is required' },
        { status: 400 }
      );
    }
    
    const sourceLanguage = data.sourceLanguage || 'en';
    
    const transCreatedContent = await transCreateContent(
      data.content,
      sourceLanguage,
      data.targetLanguage,
      data.targetCountry
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      sourceLanguage,
      targetLanguage: data.targetLanguage,
      targetCountry: data.targetCountry,
      ...transCreatedContent
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
    
    return handleApiError(new Error(errorMessage), 'Content Trans-creation Error', statusCode);
  }
}); 