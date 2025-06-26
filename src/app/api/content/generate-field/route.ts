import { NextResponse, NextRequest } from 'next/server';
// import { createSupabaseServerClient } from '@/lib/supabase/server'; // For DB access with RLS
import { generateTextCompletion } from '@/lib/azure/openai';
 // Use the withAuth wrapper
import type { ContentTemplate as Template } from '@/types/template';
import type { Brand } from '@/types/models'; // Corrected Brand type import
import { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

// Helper function to get template details
async function getTemplateDetails(templateId: string, supabaseClient: ReturnType<typeof createSupabaseAdminClient>): Promise<Template | null> {
  const { data: template, error } = await supabaseClient
    .from('content_templates')
    .select('*, inputFields:content_template_input_fields(*), outputFields:content_template_output_fields(*)')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('[generate-field] Error fetching template details:', error);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return template as any as Template;
}

// Helper function to get brand details
async function getBrandDetails(brandId: string, supabaseClient: ReturnType<typeof createSupabaseAdminClient>): Promise<Brand | null> {
  const { data: brand, error } = await supabaseClient
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (error) {
    console.error('[generate-field] Error fetching brand details:', error);
    return null;
  }
  return brand as Brand;
}

// Enhanced interpolatePrompt function
function interpolatePrompt(
  promptText: string,
  templateFieldValues: Record<string, string>,
  existingOutputs: Record<string, string>,
  brandDetails: Brand | null
): string {
  let interpolated = promptText;

  // Replace input field placeholders: {{inputFieldName}}
  // These come from templateFieldValues, keys are field names
  for (const key in templateFieldValues) {
    const placeholder = new RegExp(`{{${key.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')}}}`, 'g');
    interpolated = interpolated.replace(placeholder, templateFieldValues[key] || '');
  }

  // Replace output field placeholders: {{outputFieldName}}
  // These come from existingOutputs, keys are field names (or IDs if that's how they are stored)
  for (const key in existingOutputs) {
    const placeholder = new RegExp(`{{${key.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')}}}`, 'g');
    interpolated = interpolated.replace(placeholder, existingOutputs[key] || '');
  }

  // Replace generic brand placeholders if they are used in the promptText
  if (brandDetails) {
    interpolated = interpolated.replace(/{{Brand Name}}/g, brandDetails.name || '');
    interpolated = interpolated.replace(/{{Brand Identity}}/g, brandDetails.brand_identity || '');
    interpolated = interpolated.replace(/{{Tone of Voice}}/g, brandDetails.tone_of_voice || '');
    interpolated = interpolated.replace(/{{Guardrails}}/g, brandDetails.guardrails || '');
    // Note: {{Brand Summary}} and {{Generic Brand Object}} are not directly mapped here
    // as their exact source/meaning from brandDetails is unclear.
    // If 'brand_identity' is considered 'Brand Summary', that's covered.
  }
  return interpolated;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuthAndCSRF(async (req: NextRequest, _user: User): Promise<Response> => {
  const supabase = createSupabaseAdminClient();
  try {
    const body = await req.json();
    const {
      brand_id,
      template_id,
      template_field_values = {}, // User inputs for the template's input fields
      output_field_to_generate_id,
      existing_outputs = {}, // Current values of other generated output fields for context
      // title // Current main title, if needed for context
    } = body;

    if (!brand_id || !template_id || !output_field_to_generate_id) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: brand_id, template_id, or output_field_to_generate_id' }, { status: 400 });
    }

    const [template, brandDetails] = await Promise.all([
      getTemplateDetails(template_id, supabase),
      getBrandDetails(brand_id, supabase)
    ]);

    if (!template) {
      return NextResponse.json({ success: false, error: 'Content template not found' }, { status: 404 });
    }
    if (!brandDetails) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }

    const outputFieldToGenerate = template.outputFields?.find(f => f.id === output_field_to_generate_id);

    if (!outputFieldToGenerate) {
      return NextResponse.json({ success: false, error: `Output field with ID ${output_field_to_generate_id} not found in template.` }, { status: 404 });
    }

    if (!outputFieldToGenerate.aiPrompt) {
      return NextResponse.json({ success: false, error: `Output field ${outputFieldToGenerate.name} does not have an AI prompt configured.` }, { status: 400 });
    }
    
    // 1. Interpolate the specific AI prompt for the output field based on its definition in the template
    // This fills in {{inputFieldPlaceholder}}, {{outputFieldPlaceholder}}, and any {{Brand...}} placeholders
    // *if* they were used by the template designer in this specific outputField.aiPrompt.
    const baseFieldSpecificInstructions = interpolatePrompt(
      outputFieldToGenerate.aiPrompt || '', // Ensure aiPrompt is a string
      template_field_values,
      existing_outputs,
      brandDetails
    );

    // 2. Construct the final user prompt with explicit brand context + the field-specific task
    let contextualizedUserPrompt = "";
    const INDENT = "  "; // For formatting if desired

    contextualizedUserPrompt += `BRAND CONTEXT:\n`;
    contextualizedUserPrompt += `${INDENT}Brand Name: ${brandDetails.name}\n`;
    if (brandDetails.brand_identity) {
      contextualizedUserPrompt += `${INDENT}Brand Identity:\n${INDENT}${INDENT}${brandDetails.brand_identity.split('\\n').join(`\\n${INDENT}${INDENT}`)}\n`; // Indent multi-line identity
    }
    if (brandDetails.tone_of_voice) {
      contextualizedUserPrompt += `${INDENT}Tone of Voice: ${brandDetails.tone_of_voice}\n`;
    }
    if (brandDetails.guardrails) {
      contextualizedUserPrompt += `${INDENT}Brand Guardrails:\n${INDENT}${INDENT}${brandDetails.guardrails.split('\\n').join(`\\n${INDENT}${INDENT}`)}\n`; // Indent multi-line guardrails
    }
    contextualizedUserPrompt += `\nTASK TO PERFORM:\n`;
    contextualizedUserPrompt += `${INDENT}You are generating content *only* for the field named "${outputFieldToGenerate.name}".\n`;
    contextualizedUserPrompt += `${INDENT}Adhere to the brand context provided above.\n`;
    contextualizedUserPrompt += `${INDENT}Use the following instructions and input data (if any) to generate the content for this field:\n\n`;
    contextualizedUserPrompt += baseFieldSpecificInstructions;

    const systemPrompt = `You are an AI assistant specialized in generating specific pieces of marketing content based on detailed instructions and brand context. Your goal is to produce accurate, high-quality text for the requested field ONLY. Do not add conversational fluff or any introductory/concluding remarks beyond the direct content for the field.`;
    
    let singleFieldMaxTokens = 250; // Default for plain text
    if (outputFieldToGenerate.type === 'richText') {
      singleFieldMaxTokens = 1000; // Longer for rich text
    } else if (outputFieldToGenerate.type === 'html') {
      singleFieldMaxTokens = 1500; // Potentially longer for HTML
    }

    const generatedText = await generateTextCompletion(
      systemPrompt,
      contextualizedUserPrompt,
      singleFieldMaxTokens,
      0.7
    );

    if (!generatedText) {
      console.error(`[generate-field] AI generation failed for field ${outputFieldToGenerate.name} (ID: ${outputFieldToGenerate.id}). Prompt:`, contextualizedUserPrompt);
      return NextResponse.json({ success: false, error: `AI failed to generate content for field: ${outputFieldToGenerate.name}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      generated_text: generatedText,
      field_id: outputFieldToGenerate.id,
      field_name: outputFieldToGenerate.name
    });

  } catch (error: unknown) {
    console.error('[generate-field] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'An unexpected error occurred' }, { status: 500 });
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 