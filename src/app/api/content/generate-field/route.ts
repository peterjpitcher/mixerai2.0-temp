import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // For DB access with RLS
import { generateTextCompletion, getAzureOpenAIClient, getModelName } from '@/lib/azure/openai';
import { withAuth } from '@/lib/auth/api-auth'; // Use the withAuth wrapper
import type { InputField, OutputField, ContentTemplate as Template } from '@/types/template';
import { User } from '@supabase/supabase-js';

// Helper function to get template details
async function getTemplateDetails(templateId: string, supabaseClient: any): Promise<Template | null> {
  const { data: template, error } = await supabaseClient
    .from('content_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('[generate-field] Error fetching template details:', error);
    return null;
  }
  return template as Template;
}

// Helper function to interpolate prompt (simplified - ensure it matches your needs)
function interpolatePrompt(prompt: string, templateFieldValues: Record<string, string>, existingOutputs: Record<string, string>, title?: string): string {
  let interpolated = prompt;
  
  // Interpolate input fields by their ID (assuming templateFieldValues keys are field IDs)
  Object.keys(templateFieldValues).forEach(fieldId => {
    const placeholderById = `{{${fieldId}}}`; // e.g. {{topic_field_id}}
    const value = templateFieldValues[fieldId] || '';
    const regexById = new RegExp(placeholderById.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'gi');
    interpolated = interpolated.replace(regexById, value);
  });

  // It might also be useful to interpolate by field name if prompts use that
  // This would require access to the template inputFields definition here to map names to IDs

  // Interpolate existing outputs for context
  Object.keys(existingOutputs).forEach(outputFieldId => {
    const placeholder = `{{output.${outputFieldId}}}`; // e.g. {{output.body_field_id}}
    const value = existingOutputs[outputFieldId] || '';
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'gi');
    interpolated = interpolated.replace(regex, value);
  });
  
  if (title) {
    interpolated = interpolated.replace(/\{\{\s*article title\s*\}\}/gi, title);
  }
  return interpolated;
}

export const POST = withAuth(async (request: NextRequest, user: User) => {
  try {
    const supabase = createSupabaseServerClient(); // Standard server client for RLS

    const body = await request.json();
    const { 
      brand_id, 
      template_id, 
      template_field_values, 
      output_field_to_generate_id,
      existing_outputs = {},
      title = ''
    } = body;

    if (!brand_id || !template_id || !template_field_values || !output_field_to_generate_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields for field regeneration.' }, { status: 400 });
    }

    const template = await getTemplateDetails(template_id, supabase);
    if (!template || !template.fields || !template.fields.outputFields) {
      return NextResponse.json({ success: false, error: 'Template not found or invalid.' }, { status: 404 });
    }

    const outputFieldToGenerate = (template.fields.outputFields as OutputField[]).find(f => f.id === output_field_to_generate_id);
    if (!outputFieldToGenerate || !outputFieldToGenerate.aiPrompt) {
      return NextResponse.json({ success: false, error: 'Output field not found in template or has no AI prompt.' }, { status: 400 });
    }
    
    const populatedPrompt = interpolatePrompt(
      outputFieldToGenerate.aiPrompt,
      template_field_values,
      existing_outputs,
      title
    );
    
    const systemPrompt = "You are an AI assistant that generates content for a specific field based on user inputs and existing related content. Be concise and directly address the field's purpose. Provide only the direct text for the field itself.";
    
    // Using existing generateTextCompletion function
    // Max tokens for a single field might be less than for a full content generation.
    // The OutputField type doesn't have maxTokens. Using a default like 500 or the one in generateTextCompletion (250).
    // Let's use a moderate default for single field regeneration, adjustable if needed.
    let singleFieldMaxTokens = 500; // Default
    if (outputFieldToGenerate.type === 'richText') {
      singleFieldMaxTokens = 1000; // Longer for rich text (e.g., body paragraphs)
    } else if (outputFieldToGenerate.type === 'plainText') {
      singleFieldMaxTokens = 200; // Shorter for plain text (e.g., titles, meta descriptions)
    }
    // For 'html' or 'image' types, the default 500 might still apply if they were text-based prompts,
    // but typically they might have different generation mechanisms if not purely text.

    let generated_text: string | null = null;
    try {
      generated_text = await generateTextCompletion(
        systemPrompt,
        populatedPrompt,
        singleFieldMaxTokens // Use calculated max tokens
      );
    } catch (aiError: any) {
      console.error('[generate-field] Error during AI call via generateTextCompletion:', aiError);
      return NextResponse.json({ success: false, error: aiError.message || 'AI generation failed for the field.' }, { status: 500 });
    }

    if (generated_text === null) {
      // generateTextCompletion returning null implies an issue, but not necessarily an exception caught above.
      // This could be due to the AI returning no content or an unexpected structure handled within generateTextCompletion.
      // For the frontend, this will mean the field remains empty or unchanged, which is the desired behavior for a retry.
      console.warn('[generate-field] AI returned null or empty content for field.');
      // We send success:true but empty generated_text, so UI can show retry
      return NextResponse.json({ 
        success: true, 
        output_field_id: output_field_to_generate_id,
        generated_text: '' // Ensure it's an empty string for consistency
      });
    }

    return NextResponse.json({ 
      success: true, 
      output_field_id: output_field_to_generate_id,
      generated_text: generated_text.trim()
    });

  } catch (error: any) {
    console.error('Error in /api/content/generate-field:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
});

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
} 