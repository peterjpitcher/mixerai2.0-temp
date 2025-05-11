import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { getModelName } from '@/lib/azure/openai';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface SuggestionRequest {
  prompt: string;
  fieldType: string;
  formValues: Record<string, any>;
  options?: {
    maxLength?: number;
    format?: string;
  };
}

/**
 * POST: Generate suggestions for a field using AI
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const data: SuggestionRequest = await request.json();
    
    // Validate request
    if (!data.prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // Process the prompt template by replacing variables with form values
    let processedPrompt = data.prompt;
    
    if (data.formValues) {
      // Replace template variables (e.g., {{fieldName}}) with actual values
      Object.entries(data.formValues).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedPrompt = processedPrompt.replace(regex, String(value));
      });
    }
    
    // Construct system message based on field type
    let systemMessage = 'You are a helpful assistant providing content suggestions.';
    
    switch (data.fieldType) {
      case 'shortText':
        systemMessage += ' Provide a concise response.';
        break;
      case 'longText':
        systemMessage += ' Provide a detailed response.';
        break;
      case 'tags':
        systemMessage += ' Provide a comma-separated list of relevant keywords or tags.';
        break;
      default:
        systemMessage += ' Tailor your response to be appropriate for the requested field.';
    }
    
    // Add format instructions if specified
    if (data.options?.format) {
      systemMessage += ` Format your response as ${data.options.format}.`;
    }

    const deploymentName = getModelName();
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview';

    // Make the API call directly with error handling
    try {
      // Prepare the request body
      const completionRequest = {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: processedPrompt }
        ],
        max_tokens: data.options?.maxLength || 150,
        temperature: 0.7,
      };
      
      // Specify the deployment in the URL path
      const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=${azureApiVersion}`;
      
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
      
      // Extract the suggestion from the response
      const suggestion = responseData.choices?.[0]?.message?.content?.trim() || '';
      
      return NextResponse.json({
        success: true,
        suggestion
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    return handleApiError(error, 'Failed to generate suggestion');
  }
}); 