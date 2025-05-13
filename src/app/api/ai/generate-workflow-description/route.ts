import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the expected request body schema
const WorkflowDetailsSchema = z.object({
  workflowName: z.string().min(1, { message: 'Workflow name is required' }),
  brandName: z.string().optional(),
  templateName: z.string().optional(),
  stepNames: z.array(z.string()).optional(),
  brandCountry: z.string().optional(),
  brandLanguage: z.string().optional(),
});

// Placeholder for actual OpenAI client and call
async function callOpenAI(prompt: string): Promise<string | null> {
  // In a real scenario, you would use the OpenAI SDK here
  // e.g., import OpenAI from 'openai';
  // const openai = new OpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY });
  // const completion = await openai.chat.completions.create({
  //   model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-3.5-turbo',
  //   messages: [{ role: 'system', content: 'You are an expert marketing copywriter.' }, { role: 'user', content: prompt }],
  // });
  // return completion.choices[0].message.content;
  
  // Mock response for now:
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  if (prompt.includes("fail_generation")) return null; // For testing failure
  return `This is an AI-generated description based on the prompt: "${prompt.substring(0, 100)}..."`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = WorkflowDetailsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { workflowName, brandName, templateName, stepNames, brandCountry, brandLanguage } = validationResult.data;

    let prompt = `Generate a concise and engaging marketing description for a workflow named "${workflowName}".`;
    if (brandName) {
      prompt += ` This workflow is specifically designed for the brand "${brandName}".`;
    }
    if (brandCountry && brandLanguage) {
      prompt += ` It targets the ${brandCountry} market and uses the ${brandLanguage} language.`;
    }
    if (templateName) {
      prompt += ` It often utilizes the "${templateName}" content template.`;
    }
    if (stepNames && stepNames.length > 0) {
      prompt += ` The workflow involves the following key stages or steps: ${stepNames.join(', ')}.`;
    } else {
      prompt += ` It is a flexible workflow, and specific steps can be defined as needed.`;
    }
    prompt += ` Highlight its primary purpose and benefits in streamlining content creation and approval processes. The description should be suitable for a dashboard overview.`;

    const generatedDescription = await callOpenAI(prompt);

    if (!generatedDescription) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate workflow description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription 
    });

  } catch (error) {
    console.error('[AI_GENERATE_WORKFLOW_DESCRIPTION_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate workflow description' },
      { status: 500 }
    );
  }
} 