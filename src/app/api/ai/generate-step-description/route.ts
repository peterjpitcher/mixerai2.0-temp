import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';
import { getModelName } from '@/lib/azure/openai';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';

// Define the expected request body schema
const StepContextSchema = z.object({
  brand_id: z.string().uuid({ message: 'brand_id must be a valid UUID' }).optional(),
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
  try {
    const deploymentName = getModelName();
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!apiKey || !azureEndpoint) {
      console.error('[generate-step-description] Azure OpenAI API key or endpoint is missing from environment variables.');
      throw new Error('Azure OpenAI API key or endpoint is missing.');
    }

    console.log(`[generate-step-description] Making DIRECT FETCH API call to Azure OpenAI. Deployment: ${deploymentName}`);

    const requestBody = {
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7,
      top_p: 0.95,
    };

    const apiVersion = "2023-12-01-preview"; // Or your preferred stable version
    const url = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-step-description] Azure API request failed with status ${response.status}: ${errorText}`);
      throw new Error(`Azure API request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    const description = responseData.choices?.[0]?.message?.content?.trim();

    if (!description) {
      console.error('[generate-step-description] AI returned no content for step description.');
      return null;
    }

    console.log(`[generate-step-description] Successfully generated step description (via direct fetch): ${description.substring(0,100)}...`);
    return description;

  } catch (error) {
    console.error('[generate-step-description] Error in callOpenAI (direct fetch):', error);
    return null;
  }
}

export const POST = withAuthAndCSRF(async function (request: NextRequest, user: User) {
  try {
    const body = await request.json();
    const validationResult = StepContextSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { brand_id, workflowName, brandName, templateName, stepName, role, brandCountry, brandLanguage } = validationResult.data;

    if (brand_id) {
      const supabase = createSupabaseAdminClient();
      try {
        await requireBrandAccess(supabase, user, brand_id);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions. Please try again later.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'You do not have access to this brand.' },
            { status: 403 }
          );
        }
        throw error;
      }
    }

    // Refined Prompt:
    let prompt = `As an AI assistant, your task is to generate a clear and concise description for a step in a content workflow. This description will be read by a human user who is assigned to this step. The user needs to understand their specific responsibilities and expectations for this step based on their role.

Context for the step "${stepName}":
- Role: "${role}"
`;

    if (workflowName) {
      prompt += `- Part of Workflow: "${workflowName}"\n`;
    }
    if (brandName) {
      prompt += `- For Brand: "${brandName}"\n`;
    }
    if (templateName) {
      prompt += `- Associated Content Template: "${templateName}"\n`;
    }
    if (brandCountry && brandLanguage) {
      prompt += `- Target Market/Language: ${brandCountry} / ${brandLanguage}\n`;
    }

    prompt += `
Instructions for the AI:
Based on all the context above, generate a user-friendly description for the step "${stepName}". This description should clearly explain what the user in the "${role}" role is expected to do. 
For example:
- If the role is 'Editor' for a 'Review Draft' step, the description might be: "As the Editor for the '${brandName || 'brand'}' brand, review the content draft for clarity, grammar, style, and adherence to brand guidelines. Ensure all feedback is constructive and helps improve the quality of the content for the '${workflowName || 'workflow'}' workflow."
- If the role is 'Legal' for an 'Approve Claims' step, it might be: "As the Legal reviewer for the '${brandName || 'brand'}' brand, verify all claims made in the content for legal compliance and accuracy, specifically for the ${brandCountry || 'target market'}. Ensure the content aligns with all regulatory requirements for the '${workflowName || 'workflow'}' workflow."

Focus on the key actions and responsibilities for the user in this step. Be specific and practical. The description should be 1-3 sentences long. Output only the description text.
`;
    
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
}) 
