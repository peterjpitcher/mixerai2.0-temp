import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the expected request body schema
const TemplateContextSchema = z.object({
  templateName: z.string().min(1, { message: 'Template name is required' }),
  inputFields: z.array(z.string()).optional(), // Expecting array of field names
  outputFields: z.array(z.string()).optional(), // Expecting array of field names
});

// Placeholder for actual OpenAI client and call
async function callOpenAI(prompt: string): Promise<string | null> {
  // Mock response for now:
  await new Promise(resolve => setTimeout(resolve, 200));
  if (prompt.includes("fail_generation")) return null;
  return `AI Template Description: "${prompt.substring(0, 120)}..." (Based on template structure).`;
}

export async function POST(request: NextRequest) {
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

    let prompt = `Generate a clear and informative description for a content template named "${templateName}".`;
    if (inputFields && inputFields.length > 0) {
      prompt += ` This template is designed to take the following inputs: ${inputFields.join(', ')}.`;
    } else {
      prompt += ` This template does not require predefined input fields; inputs can be determined as needed.`;
    }
    if (outputFields && outputFields.length > 0) {
      prompt += ` It will generate content for the following output fields: ${outputFields.join(', ')}.`;
    } else {
      prompt += ` The specific output fields will be generated based on the content request.`;
    }
    prompt += ` Explain its primary use case and the type of structured content it helps create efficiently. This description will be shown to users selecting a template.`;

    const generatedDescription = await callOpenAI(prompt);

    if (!generatedDescription) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate template description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription 
    });

  } catch (error) {
    console.error('[AI_GENERATE_TEMPLATE_DESCRIPTION_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate template description' },
      { status: 500 }
    );
  }
} 