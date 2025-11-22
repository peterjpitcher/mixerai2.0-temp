import { generateTextCompletion } from '@/lib/azure/openai';

interface StepDescriptionGenerationProps {
  stepName: string;
  role: string;
  workflowName?: string;
  brandName?: string;
  templateName?: string;
  brandCountry?: string;
  brandLanguage?: string;
}

export async function generateStepDescription(props: StepDescriptionGenerationProps): Promise<string | null> {
  const { stepName, role, workflowName, brandName, templateName, brandCountry, brandLanguage } = props;

  let prompt = `As an AI assistant, your task is to generate a clear and concise description for a step in a content workflow. This description will be read by a human user who is assigned to this step. The user needs to understand their specific responsibilities and expectations for this step based on their role.

Context for the step "${stepName}":
- Role: "${role}"
`;

  if (workflowName) {
    prompt += `- Part of Workflow: "${workflowName}"
`;
  }
  if (brandName) {
    prompt += `- For Brand: "${brandName}"
`;
  }
  if (templateName) {
    prompt += `- Associated Content Template: "${templateName}"
`;
  }
  if (brandCountry && brandLanguage) {
    prompt += `- Target Market/Language: ${brandCountry} / ${brandLanguage}
`;
  }

  prompt += `
Instructions for the AI:
Based on all the context above, generate a user-friendly description for the step "${stepName}". This description should clearly explain what the user in the "${role}" role is expected to do. 
For example:
- If the role is 'Editor' for a 'Review Draft' step, the description might be: "As the Editor for the '${brandName || 'brand'}' brand, review the content draft for clarity, grammar, style, and adherence to brand guidelines. Ensure all feedback is constructive and helps improve the quality of the content for the '${workflowName || 'workflow'}' workflow."
- If the role is 'Legal' for an 'Approve Claims' step, it might be: "As the Legal reviewer for the '${brandName || 'brand'}' brand, verify all claims made in the content for legal compliance and accuracy, specifically for the ${brandCountry || 'target market'}. Ensure the content aligns with all regulatory requirements for the '${workflowName || 'workflow'}' workflow."

Focus on the key actions and responsibilities for the user in this step. Be specific and practical. The description should be 1-3 sentences long. Output only the description text.
`;

  try {
    // Using 200 tokens as per the original implementation
    const description = await generateTextCompletion(
      "You are an AI assistant that generates workflow step descriptions.", // Default system prompt
      prompt, 
      200
    );
    return description ? description.trim() : null;
  } catch (error) {
    console.error('[generateStepDescription] Error calling generateTextCompletion:', error);
    return null;
  }
}
