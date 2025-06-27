import { NextRequest, NextResponse } from 'next/server';
// OpenAI import removed as the client instance was unused and direct fetch is used.
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { withAuthAndCSRF } from '@/lib/api/with-csrf'; // Import for consistent error handling

// const openai = new OpenAI({ ... }); // Unused OpenAI client initialization removed

export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { type, stepName, existingDescription, otherSteps, brandContext } = body;
    
    // userId for auditing is available via the 'user' object from withAuthAndMonitoring
    // Example: user.id
    
    if (!type || !stepName) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: type and stepName are required.' },
        { status: 400 }
      );
    }
    
    if (!process.env.AZURE_OPENAI_API_KEY || 
        !process.env.AZURE_OPENAI_ENDPOINT || 
        !process.env.AZURE_OPENAI_DEPLOYMENT) {
      // This error should ideally be caught by a health check or at startup.
      // Returning a generic error to the client for security.
      return NextResponse.json(
        { success: false, error: 'AI service configuration error.' },
        { status: 500 }
      );
    }
    
    let prompt = '';
    let systemMessage = '';
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15'; // Use env var or default

    if (type === 'generate') {
      systemMessage = "You are a concise workflow assistant that creates brief, professional step descriptions. Keep descriptions under 30 words. Be clear and professional, focusing on the purpose of the step.";
      if (brandContext) {
        systemMessage += ` Use language appropriate for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} as their primary language.`;
      }
      let stepsContext = '';
      if (otherSteps && Array.isArray(otherSteps) && otherSteps.length > 0) {
        stepsContext = "Other steps in this workflow include: " + 
          otherSteps.map((s: {name: string, description?: string}) => `\"${s.name}\" (${s.description || 'No description'})`).join(', ');
      }
      prompt = `Generate a concise professional description (maximum 30 words) for a workflow step named \"${stepName}\".\n${stepsContext ? stepsContext + '\\n' : ''}${brandContext ? `This is for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} language.\\n` : ''}Keep the description focused on what happens during this step in the content workflow.`;
    } 
    else if (type === 'polish') {
      if (!existingDescription) {
        return NextResponse.json(
          { success: false, error: 'Missing existingDescription for polish operation.' },
          { status: 400 }
        );
      }
      systemMessage = "You are a concise professional editor that improves workflow step descriptions. Keep descriptions under 30 words. Maintain the original meaning while making the text more professional, clear, and concise.";
      if (brandContext) {
        systemMessage += ` Use language appropriate for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} as their primary language.`;
      }
      prompt = `Polish the following workflow step description for the step \"${stepName}\" while keeping it under 30 words:\n\"${existingDescription}\"\n${brandContext ? `This is for ${brandContext.name} brand, which operates in ${brandContext.country} and uses ${brandContext.language} language.\\n` : ''}Improve clarity, professionalism, and conciseness while preserving the original meaning.`;
    } 
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter. Must be \'generate\' or \'polish\'.' },
        { status: 400 }
      );
    }
    
    try {
      const response = await fetch(
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${azureApiVersion}`,
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
          cache: 'no-store'
        }
      );
      
      if (!response.ok) {
        // const errorText = await response.text(); // Avoid logging raw API error to client-facing logs
        throw new Error(`AI service request failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      let description = responseData.choices?.[0]?.message?.content?.trim() || '';
      description = description.replace(/^["\']|["\']$/g, '');
      
      return NextResponse.json({
        success: true,
        description,
        userId: user.id // Included from withAuthAndMonitoring
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_aiError) {
      // Error from AI service call. Return a generic error to the client.
      // Specifics of aiError should be logged by a proper server-side logging solution if needed.
      return NextResponse.json(
        { success: false, error: 'AI service failed to generate description. Please try again later.' },
        { status: 503 } // Service Unavailable is appropriate here
      );
    }
  } catch (error) {
    // Catch all for other unexpected errors
    return handleApiError(error, 'Failed to generate description');
  }
}); 