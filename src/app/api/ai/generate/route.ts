import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { getModelName } from '@/lib/azure/openai';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface GenerationRequest {
  templateId: string;
  outputFieldId: string;
  prompt: string;
  formValues: Record<string, unknown>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    format?: string;
  };
}

/**
 * POST: Generate content for output fields using AI
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const data: GenerationRequest = await request.json();
    
    // Validate request
    if (!data.prompt || !data.outputFieldId) {
      return NextResponse.json(
        { success: false, error: 'Prompt and output field ID are required' },
        { status: 400 }
      );
    }
    
    // Process the prompt template by replacing variables with form values
    let processedPrompt = data.prompt;
    
    if (data.formValues) {
      // Replace template variables (e.g., {{fieldName}}) with actual values
      Object.entries(data.formValues).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        
        // Handle arrays (like tags) by joining them
        const stringValue = Array.isArray(value) ? value.join(', ') : String(value || '');
        
        processedPrompt = processedPrompt.replace(regex, stringValue);
      });
    }
    
    // Construct system message
    const systemMessage = 'You are an expert content creator generating high-quality content based on the provided details. Your response should be well-formatted and ready to use.';
    
    const deploymentName = getModelName();
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview';
    
    // Make the API call directly with error handling
    try {
      const completionRequest = {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: processedPrompt }
        ],
        max_tokens: data.options?.maxTokens || 1000,
        temperature: data.options?.temperature || 0.7,
        top_p: 0.95,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      };
      
      const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=${azureApiVersion}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY || ''
        },
        body: JSON.stringify(completionRequest)
      });
      
      if (!response.ok) {
        await response.text();
        throw new Error(`AI service request failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      const content = responseData.choices?.[0]?.message?.content?.trim() || "";
      
      return NextResponse.json({
        success: true,
        content: content,
        fieldId: data.outputFieldId
      });
    } catch (aiError: unknown) {
      throw aiError;
    }
  } catch (error: unknown) {
    let errorMessage = 'Failed to generate AI content. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as { status?: number }).status === 429 || error.message.includes('Azure OpenAI') || error.message.includes('AI service request failed')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return handleApiError(error, errorMessage, statusCode);
  }
}); 