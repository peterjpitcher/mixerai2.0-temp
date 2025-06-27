import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateTextCompletion } from '@/lib/azure/openai';
import { withCSRF } from '@/lib/api/with-csrf'; // Import the actual AI utility

// Define the expected request body schema
const TemplateContextSchema = z.object({
  templateName: z.string().min(1, { message: 'Template name is required' }),
  inputFields: z.array(z.string()).optional(), // Expecting array of field names
  outputFields: z.array(z.string()).optional(), // Expecting array of field names
});

// Actual OpenAI call using generateTextCompletion
async function getAITemplateDescription(prompt: string): Promise<string | null> {
  const systemPrompt = "You are an AI assistant tasked with writing a clear, concise, and helpful description for a content template. This description will be shown to users to help them understand the template's purpose and choose the right one. Do not use any prefixes like 'AI Template Description:'. Just provide the description text itself.";
  try {
    // Using around 100-150 tokens for a good, untruncated description.
    // 1 token is roughly 0.75 words. 150 tokens ~ 112 words.
    const description = await generateTextCompletion(systemPrompt, prompt, 150);
    return description;
  } catch (error) {
    console.error('[getAITemplateDescription] Error calling generateTextCompletion:', error);
    return null; // Indicate failure to the caller
  }
}

export const POST = withCSRF(async function (request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = TemplateContextSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { templateName, inputFields, outputFields } = validationResult.data;

    // Construct a detailed prompt for the AI
    let userPrompt = `Generate a clear and informative description for a content template named "${templateName}".`;
    if (inputFields && inputFields.length > 0) {
      userPrompt += ` This template is designed to take the following inputs: ${inputFields.join(', ')}.`;
    } else {
      userPrompt += ` This template allows for flexible input fields to be defined as needed.`;
    }
    if (outputFields && outputFields.length > 0) {
      userPrompt += ` It will generate content for the following output fields: ${outputFields.join(', ')}.`;
    } else {
      userPrompt += ` The specific output fields generated can vary based on the content creation request.`;
    }
    userPrompt += ` Focus on its primary use case and the type of structured content it helps create efficiently. The description should be engaging and help users quickly understand if this template meets their needs. Avoid any introductory phrases like \"This template...\" if possible, and directly describe its function and benefits.`;

    const generatedDescription = await getAITemplateDescription(userPrompt);

    if (!generatedDescription) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate template description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription.trim() // Trim any leading/trailing whitespace from AI output
    });

  } catch (error) {
    console.error('[AI_GENERATE_TEMPLATE_DESCRIPTION_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate template description' },
      { status: 500 }
    );
  }
}) 