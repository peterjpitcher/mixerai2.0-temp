import { NextRequest, NextResponse } from 'next/server';
import { transCreateContent } from '@/lib/azure/openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';

interface ContentTransCreationRequest {
  content: string;
  sourceLanguage?: string;
  targetLanguage: string;
  targetCountry: string;
}

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const data: ContentTransCreationRequest = await request.json();
    
    // Validate request data
    if (!data.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!data.targetLanguage) {
      return NextResponse.json(
        { error: 'Target language is required' },
        { status: 400 }
      );
    }
    
    if (!data.targetCountry) {
      return NextResponse.json(
        { error: 'Target country is required' },
        { status: 400 }
      );
    }
    
    // Use provided source language or default to English
    const sourceLanguage = data.sourceLanguage || 'en';
    
    // Generate trans-created content
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
  } catch (error) {
    console.error('Error trans-creating content:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to trans-create content' 
      },
      { status: 500 }
    );
  }
}); 