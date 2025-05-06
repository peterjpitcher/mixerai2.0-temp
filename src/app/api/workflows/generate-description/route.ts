import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';

// Simplified Azure OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
  defaultQuery: { 'api-version': '2023-05-15' },
});

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { type, stepName, existingDescription, otherSteps, brandContext } = body;
    
    console.log('Received request with body:', {
      type,
      stepName,
      existingDescription: existingDescription ? 'exists' : 'none',
      otherSteps: otherSteps ? `${otherSteps.length} steps` : 'none',
      brandContext: brandContext ? JSON.stringify(brandContext) : 'none',
      userId: user.id // Log the user ID for audit
    });
    
    if (!type || !stepName) {
      console.error('Missing required parameters:', { type, stepName });
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Validate environment variables
    if (!process.env.AZURE_OPENAI_API_KEY || 
        !process.env.AZURE_OPENAI_ENDPOINT || 
        !process.env.AZURE_OPENAI_DEPLOYMENT) {
      console.error('Missing required environment variables for Azure OpenAI');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Azure OpenAI configuration is incomplete. Please set all required environment variables.' 
        },
        { status: 500 }
      );
    }
    
    let prompt = '';
    let systemMessage = '';
    
    if (type === 'generate') {
      systemMessage = "You are a concise workflow assistant that creates brief, professional step descriptions. Keep descriptions under 30 words. Be clear and professional, focusing on the purpose of the step.";
      
      // Add brand context to the system message if available
      if (brandContext) {
        systemMessage += ` Use language appropriate for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} as their primary language.`;
      }
      
      // Create context from other steps if available
      let stepsContext = '';
      if (otherSteps && Array.isArray(otherSteps) && otherSteps.length > 0) {
        stepsContext = "Other steps in this workflow include: " + 
          otherSteps.map(s => `"${s.name}" (${s.description || 'No description'})`).join(', ');
      }
      
      prompt = `Generate a concise professional description (maximum 30 words) for a workflow step named "${stepName}".
      
${stepsContext ? stepsContext + '\n' : ''}
${brandContext ? `This is for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} language.\n` : ''}
Keep the description focused on what happens during this step in the content workflow.`;
    } 
    else if (type === 'polish') {
      if (!existingDescription) {
        console.error('Missing existing description for polishing');
        return NextResponse.json(
          { success: false, error: 'Missing existing description for polishing' },
          { status: 400 }
        );
      }
      
      systemMessage = "You are a concise professional editor that improves workflow step descriptions. Keep descriptions under 30 words. Maintain the original meaning while making the text more professional, clear, and concise.";
      
      // Add brand context to the system message if available
      if (brandContext) {
        systemMessage += ` Use language appropriate for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} as their primary language.`;
      }
      
      prompt = `Polish the following workflow step description for the step "${stepName}" while keeping it under 30 words:
      
"${existingDescription}"

${brandContext ? `This is for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} language.\n` : ''}
Improve clarity, professionalism, and conciseness while preserving the original meaning.`;
    } 
    else {
      console.error('Invalid type parameter:', type);
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter' },
        { status: 400 }
      );
    }
    
    console.log('Calling OpenAI with prompt:', prompt);
    console.log('System message:', systemMessage);
    
    try {
      // Call OpenAI API using the proper format for Azure OpenAI
      const response = await fetch(
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.AZURE_OPENAI_API_KEY || ''
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.7
          }),
          cache: 'no-store' // Add no-cache to prevent caching
        }
      );
      
      if (!response.ok) {
        console.error('Azure OpenAI API error:', response.status, await response.text());
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract the generated description from Azure OpenAI response
      let description = data.choices?.[0]?.message?.content?.trim() || '';
      
      // Remove any quotes that might be wrapping the description
      description = description.replace(/^["']|["']$/g, '');
      
      console.log('Generated description:', description);
      
      const result = {
        success: true,
        description,
        userId: user.id
      };
      
      console.log('Sending response:', result);
      
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      });
    } catch (aiError) {
      console.error('OpenAI API error:', aiError);
      return NextResponse.json(
        { success: false, error: 'Error calling OpenAI API. Please check your API configuration.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating description:', error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}); 