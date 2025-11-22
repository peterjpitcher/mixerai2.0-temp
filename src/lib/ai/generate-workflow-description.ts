import { generateTextCompletion } from '@/lib/azure/openai';

interface WorkflowGenerationProps {
  workflowName: string;
  brandName?: string;
  templateName?: string;
  stepNames?: string[];
  brandCountry?: string;
  brandLanguage?: string;
}

export async function generateWorkflowDescription(props: WorkflowGenerationProps): Promise<string | null> {
  const { workflowName, brandName, templateName, stepNames, brandCountry, brandLanguage } = props;

  const systemPrompt = "You are an expert marketing copywriter. Your task is to generate a concise and engaging marketing description for a content workflow.";

  let userPrompt = `Generate a concise and engaging marketing description for a workflow named "${workflowName}".`;
  if (brandName) {
    userPrompt += ` This workflow is specifically designed for the brand "${brandName}".`;
  }
  if (brandCountry && brandLanguage) {
    userPrompt += ` It targets the ${brandCountry} market and uses the ${brandLanguage} language.`;
  }
  if (templateName) {
    userPrompt += ` It often utilizes the "${templateName}" content template.`;
  }
  if (stepNames && stepNames.length > 0) {
    userPrompt += ` The workflow involves the following key stages or steps: ${stepNames.join(', ')}.`;
  } else {
    userPrompt += ` It is a flexible workflow, and specific steps can be defined as needed.`;
  }
  userPrompt += ` Highlight its primary purpose and benefits in streamlining content creation and approval processes. The description should be suitable for a dashboard overview and be around 2-3 sentences long.`;

  // Call the actual AI generation function
  const generatedDescription = await generateTextCompletion(systemPrompt, userPrompt, 150); // Max 150 tokens for a description

  if (!generatedDescription) {
    console.error('[GENERATE_WORKFLOW_DESCRIPTION_UTIL] AI generation failed or returned null.');
    return null;
  }

  return generatedDescription.trim();
}
