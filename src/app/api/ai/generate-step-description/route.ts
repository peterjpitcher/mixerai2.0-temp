import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the expected request body schema
const StepContextSchema = z.object({
  workflowName: z.string().optional(),
  brandName: z.string().optional(),
  templateName: z.string().optional(),
  stepName: z.string().min(1, { message: 'Step name is required' }),
  role: z.string().min(1, { message: 'Role is required' }),
  brandCountry: z.string().optional(),
  brandLanguage: z.string().optional(),
});

// Placeholder for actual OpenAI client and call (can be shared or refactored)
async function callOpenAI(prompt: string): Promise<string | null> {
  // Mock response for now:
  await new Promise(resolve => setTimeout(resolve, 200));
  if (prompt.includes("fail_generation")) return null;
  return `AI Step Description: "${prompt.substring(0, 150)}..." (Based on role and context provided).`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = StepContextSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { workflowName, brandName, templateName, stepName, role, brandCountry, brandLanguage } = validationResult.data;

    let prompt = `You are generating instructions for a user in a content workflow. Their role for the current step "${stepName}" is "${role}".`;
    if (workflowName) {
      prompt += ` This step is part of the "${workflowName}" workflow`;
      if (brandName) {
        prompt += ` for the "${brandName}" brand`;
      }
      if (brandCountry && brandLanguage) {
        prompt += `, targeting the ${brandCountry} market and using the ${brandLanguage} language`;
      }
      if (templateName) {
        prompt += `, which may utilize the "${templateName}" content template`;
      }
      prompt += `.`;
    }
    prompt += ` Based on this context, provide clear and concise instructions for the "${role}" to perform their tasks for the "${stepName}" step. For example, if the role is 'Editor', explain what to review (e.g., clarity, grammar, style, brand alignment). If 'SEO', what to optimize. Be specific about the expected actions and outcomes for this step.`;
    
    const generatedDescription = await callOpenAI(prompt);

    if (!generatedDescription) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate step description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription 
    });

  } catch (error) {
    console.error('[AI_GENERATE_STEP_DESCRIPTION_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate step description' },
      { status: 500 }
    );
  }
} 