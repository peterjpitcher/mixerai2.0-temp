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
  formValues: Record<string, any>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    format?: string;
  };
}

/**
 * POST: Generate content for output fields using AI
 */
export const POST = withAuth(async (request: NextRequest, user) => {
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
    
    // Make the API call directly with error handling
    try {
      console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
      
      // Prepare the request body
      const completionRequest = {
        model: deploymentName,
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
      
      // Specify the deployment in the URL path
      const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
      console.log(`Using direct endpoint URL: ${endpoint}`);
      
      // Make a direct fetch call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY || ''
        },
        body: JSON.stringify(completionRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("API call successful");
      
      const content = responseData.choices?.[0]?.message?.content || "";
      console.log(`Received response with content length: ${content.length}`);
      
      return NextResponse.json({
        success: true,
        content: content,
        fieldId: data.outputFieldId
      });
    } catch (error: any) {
      console.error("Error generating content with Azure OpenAI:", error);
      if (error instanceof Error) throw error;
      throw new Error('Failed to generate content via Azure OpenAI.');
    }
  } catch (error: any) {
    console.error('Error generating content:', error);

    let errorMessage = 'Failed to generate AI content. Please try again later.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OpenAI') || error.message.includes('Azure') || error.message.includes('API') || (error as any).status === 429 || error.message.includes('Azure OpenAI')) {
        errorMessage = 'The AI service is currently busy or unavailable. Please try again in a few moments.';
        statusCode = 503;
      } else {
        errorMessage = error.message || errorMessage;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return handleApiError(new Error(errorMessage), 'AI Content Generation Error', statusCode);
  }
}); 