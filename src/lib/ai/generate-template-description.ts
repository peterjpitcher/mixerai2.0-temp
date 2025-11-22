import { generateTextCompletion } from '@/lib/azure/openai';

interface TemplateGenerationProps {
  templateName: string;
  inputFields?: string[];
  outputFields?: string[];
}

export async function generateTemplateDescription(props: TemplateGenerationProps): Promise<string | null> {
  const { templateName, inputFields, outputFields } = props;

  const systemPrompt = "You are an AI assistant tasked with writing a clear, concise, and helpful description for a content template. This description will be shown to users to help them understand the template's purpose and choose the right one. Do not use any prefixes like 'AI Template Description:'. Just provide the description text itself.";

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

  try {
    // Using around 100-150 tokens for a good, untruncated description.
    // 1 token is roughly 0.75 words. 150 tokens ~ 112 words.
    const description = await generateTextCompletion(systemPrompt, userPrompt, 150);
    return description ? description.trim() : null;
  } catch (error) {
    console.error('[generateTemplateDescription] Error calling generateTextCompletion:', error);
    return null;
  }
}
