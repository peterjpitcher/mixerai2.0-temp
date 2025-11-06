import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

import { User } from '@supabase/supabase-js';
import { generateTextCompletion } from '@/lib/azure/openai';
import { normalizeFieldContent } from '@/lib/content/html-normalizer';
import { Database, Json } from '@/types/supabase';
import { z } from 'zod';
import { TemplateFieldsSchema } from '@/lib/schemas/template';

type ContentVersionInsert = Database['public']['Tables']['content_versions']['Insert'];
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = "force-dynamic";

const SectionEnum = z.enum(['title', 'body', 'meta_description'] as const);
type Section = z.infer<typeof SectionEnum>;

const RegenerationRequestSchema = z
  .object({
    sections: z.array(SectionEnum).optional(),
    feedback: z.string().trim().max(2000).optional(),
    fieldId: z.string().trim().min(1).optional(),
  })
  .refine((data) => !(data.sections && data.fieldId), {
    message: 'Provide either sections or fieldId, not both.',
    path: ['fieldId'],
  });

const FaqEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answerHtml: z.string(),
  answerPlain: z.string(),
});

const FaqSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  entries: z.array(FaqEntrySchema),
});

const FaqContentSchema = z.object({
  entries: z.array(FaqEntrySchema),
  sections: z.array(FaqSectionSchema).optional(),
});

const NormalizedContentSchema = z.object({
  html: z.string(),
  plain: z.string(),
  wordCount: z.number().int().nonnegative(),
  charCount: z.number().int().nonnegative(),
  faq: FaqContentSchema.nullable().optional(),
});

const GeneratedOutputsSchema = z.record(NormalizedContentSchema);

type ParsedTemplateFields = z.infer<typeof TemplateFieldsSchema>;
type ParsedTemplateOutputField = ParsedTemplateFields['outputFields'][number];

function coerceSectionText(section: Section, value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`AI response for ${section} was not textual content.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`AI response for ${section} was empty.`);
  }
  return trimmed;
}

function hasMeaningfulContent(content: z.infer<typeof NormalizedContentSchema>): boolean {
  if (!content) return false;
  if (content.plain && content.plain.trim().length > 0) {
    return true;
  }
  if (content.html && content.html.replace(/<[^>]*>/g, '').trim().length > 0) {
    return true;
  }
  return false;
}

export const POST = withAuthAndCSRF(async (request: NextRequest, user: User, context?: unknown): Promise<Response> => {
  const { params } = context as { params: { id: string } };
  const contentId = params.id;
  
  try {
    const supabase = createSupabaseAdminClient();
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedRequest = RegenerationRequestSchema.safeParse(requestBody);
    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parsedRequest.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { sections: requestedSections, feedback, fieldId } = parsedRequest.data;
    const sections = requestedSections ?? (fieldId ? undefined : (['body'] as Section[]));
    
    // Fetch content with all necessary relations
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        *,
        brands!inner (*),
        content_templates!inner (*)
      `)
      .eq('id', contentId)
      .single();
      
    if (contentError || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Content not found' 
      }, { status: 404 });
    }
    
    // Check permissions
    const globalRole = user?.user_metadata?.role;
    if (globalRole !== 'admin' && content.brand_id) {
      const { data: permission } = await supabase
        .from('user_brand_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', content.brand_id)
        .single();
        
      if (!permission || !['admin', 'editor'].includes(permission.role)) {
        // Check if user is assigned to current workflow step
        if (!content.assigned_to?.includes(user.id)) {
          return NextResponse.json({ 
            success: false, 
            error: 'You do not have permission to regenerate this content' 
          }, { status: 403 });
        }
      }
    }
    
    // Save current version before regeneration
    const versionPayload: ContentVersionInsert = {
      content_id: contentId,
      workflow_step_identifier: content.current_step || 'manual_regeneration',
      step_name: 'Content Regeneration',
      version_number: await getNextVersionNumber(supabase, contentId),
      content_json: {
        title: content.title,
        body: content.body,
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        content_data: content.content_data
      } as Json,
      action_status: 'regeneration_requested',
      feedback: feedback ?? 'Manual regeneration requested',
      reviewer_id: user.id
    };
    
    const { error: versionError } = await supabase
      .from('content_versions')
      .insert(versionPayload);
      
    if (versionError) {
      console.error('Error creating content version:', versionError);
      // Continue with regeneration even if versioning fails
    }
    
    // Prepare regeneration context
    const template = content.content_templates;
    const brand = content.brands;
    
    if (!template || !brand) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing template or brand information' 
      }, { status: 400 });
    }
    
    // Create content with relations for prompt functions
    const contentWithRelations = {
      ...content,
      brands: brand,
      content_templates: template
    } as Record<string, unknown>; // TODO: Type properly when Database types are generated
    
    // Handle specific field regeneration
    const templateFieldsResult = TemplateFieldsSchema.safeParse(template.fields);
    if (!templateFieldsResult.success) {
      console.error('Invalid template fields for regeneration:', templateFieldsResult.error);
      return NextResponse.json(
        { success: false, error: 'Template configuration is invalid; cannot regenerate content.' },
        { status: 422 }
      );
    }
    const templateFields = templateFieldsResult.data;
    const outputFields = templateFields.outputFields ?? [];

    if (fieldId) {
      if (outputFields.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Template does not define any output fields.' },
          { status: 400 }
        );
      }
      const field = outputFields.find((f) => f.id === fieldId);
      if (!field) {
        return NextResponse.json({ 
          success: false, 
          error: 'Field not found in template' 
        }, { status: 400 });
      }
      
      // Build prompt for specific field
      const fieldPrompt = buildFieldRegenerationPrompt(
        field,
        contentWithRelations,
        contentWithRelations.brands as Record<string, unknown>,
        feedback
      );
      
      const regeneratedContent = await generateTextCompletion(
        `Generate content for ${field.name} field. Brand context: ${brand.brand_identity || 'No brand identity'}. Tone: ${brand.tone_of_voice || 'Professional'}. Guidelines: ${brand.guardrails || 'None specified'}.`,
        fieldPrompt,
        1000, // max_tokens
        0.7 // temperature
      );
      
      if (!regeneratedContent) {
        throw new Error('Failed to generate content');
      }
      const normalizedContent = normalizeFieldContent(regeneratedContent, field.type);
      let validatedContent: z.infer<typeof NormalizedContentSchema>;
      try {
        validatedContent = NormalizedContentSchema.parse(normalizedContent);
      } catch (validationError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Generated output did not match the expected schema.',
            details: validationError instanceof z.ZodError ? validationError.flatten() : undefined,
          },
          { status: 422 }
        );
      }
      if (field.required && !hasMeaningfulContent(validatedContent)) {
        return NextResponse.json(
          { success: false, error: `Generated content for "${field.name}" is empty.` },
          { status: 422 }
        );
      }

      // Update specific field in content_data
      const currentContentData = (content.content_data || {}) as Record<string, unknown>;
      const currentGeneratedOutputsRaw =
        currentContentData?.generatedOutputs && typeof currentContentData.generatedOutputs === 'object'
          ? (currentContentData.generatedOutputs as Record<string, unknown>)
          : {};

      const updatedGeneratedOutputs: Record<string, unknown> = {
        ...currentGeneratedOutputsRaw,
        [fieldId]: validatedContent,
      };
      let validatedOutputs: Record<string, z.infer<typeof NormalizedContentSchema>>;
      try {
        validatedOutputs = GeneratedOutputsSchema.parse(updatedGeneratedOutputs);
      } catch (validationError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Generated outputs map failed validation.',
            details: validationError instanceof z.ZodError ? validationError.flatten() : undefined,
          },
          { status: 422 }
        );
      }

      const updatedContentData = {
        ...currentContentData,
        generatedOutputs: validatedOutputs,
      };
      
      // If this is the primary body field, also update main body
      const updatePayload: Record<string, unknown> = { 
        content_data: updatedContentData
      };
      if (isBodyField(field, templateFields.outputFields)) {
        updatePayload.body = validatedContent.html;
      }
      
      const { error: updateError } = await supabase
        .from('content')
        .update(updatePayload)
        .eq('id', contentId);
        
      if (updateError) {
        throw updateError;
      }
      
      return NextResponse.json({ 
        success: true, 
        data: { 
          fieldId, 
          content: validatedContent 
        } 
      });
    }
    
    // Handle full content regeneration
    const sectionsToRegenerate = sections ?? (['body'] as Section[]);
    const updates: Partial<Record<string, unknown>> = {}; // TODO: Type as Partial<Database['public']['Tables']['content']['Update']> when types are regenerated
    
    for (const section of sectionsToRegenerate) {
      const prompt = buildSectionRegenerationPrompt(
        section,
        contentWithRelations,
        brand,
        template,
        feedback
      );
      
      const regeneratedContent = await generateTextCompletion(
        `Regenerate ${section} content. Brand context: ${brand.brand_identity || 'No brand identity'}. Tone: ${brand.tone_of_voice || 'Professional'}. Guidelines: ${brand.guardrails || 'None specified'}.`,
        prompt,
        1000, // max_tokens
        0.7 // temperature
      );
      
      if (!regeneratedContent) {
        throw new Error(`Failed to generate content for ${section}`);
      }
      
      let sanitizedSectionText: string;
      try {
        sanitizedSectionText = coerceSectionText(section, regeneratedContent);
      } catch (validationError) {
        const errorMessage =
          validationError instanceof Error
            ? validationError.message
            : `Generated ${section} response was invalid.`;
        return NextResponse.json({ success: false, error: errorMessage }, { status: 422 });
      }

      updates[section] = sanitizedSectionText;
    }
    
    // Update content with regenerated sections
    const { error: updateError } = await supabase
      .from('content')
      .update(updates)
      .eq('id', contentId);
      
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: updates 
    });
    
  } catch (error) {
    console.error('Regeneration error:', error);
    return handleApiError(error, 'Failed to regenerate content');
  }
});

async function getNextVersionNumber(
  supabase: ReturnType<typeof createSupabaseAdminClient>, 
  contentId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { 
    throw error;
  }
  return (data?.version_number || 0) + 1;
}

function buildFieldRegenerationPrompt(
  field: ParsedTemplateOutputField,
  content: Record<string, unknown>, // TODO: Type as Database['public']['Tables']['content']['Row'] & {...} when types are regenerated
  brand: Record<string, unknown>, // TODO: Type as Database['public']['Tables']['brands']['Row'] when types are regenerated
  feedback?: string
): string {
  const contentData = content.content_data as Record<string, unknown>;
  const inputValues = contentData?.templateInputValues || {};
  
  let prompt = `You are regenerating the "${field.name}" field for existing content.\n\n`;
  
  if (feedback) {
    prompt += `IMPORTANT FEEDBACK TO INCORPORATE: ${feedback}\n\n`;
  }
  
  prompt += `Content Context:\n`;
  prompt += `- Title: ${content.title}\n`;
  prompt += `- Template: ${(content.content_templates as Record<string, unknown>)?.name || 'Unknown'}\n`;
  prompt += `- Brand: ${brand.name}\n\n`;
  
  prompt += `Input Values:\n`;
  Object.entries(inputValues).forEach(([key, value]) => {
    prompt += `- ${key}: ${value}\n`;
  });
  
  prompt += `\nField Instructions: ${field.prompt || 'Generate appropriate content for this field.'}\n`;
  prompt += `\nRegenerate the content for this field, ensuring it aligns with the brand voice and incorporates any feedback provided.`;
  
  return prompt;
}

function buildSectionRegenerationPrompt(
  section: Section,
  content: Record<string, unknown>, // TODO: Type as Database['public']['Tables']['content']['Row'] & {...} when types are regenerated
  brand: Record<string, unknown>, // TODO: Type as Database['public']['Tables']['brands']['Row'] when types are regenerated
  template: Record<string, unknown>, // TODO: Type as Database['public']['Tables']['content_templates']['Row'] when types are regenerated
  feedback?: string
): string {
  const contentData = content.content_data as Record<string, unknown>;
  const inputValues = contentData?.templateInputValues || {};
  
  let prompt = `You are regenerating the ${section} for existing content.\n\n`;
  
  if (feedback) {
    prompt += `IMPORTANT FEEDBACK TO INCORPORATE: ${feedback}\n\n`;
  }
  
  prompt += `Current Content:\n`;
  prompt += `- Title: ${content.title}\n`;
  prompt += `- Current ${section}: ${content[section] || 'Not set'}\n`;
  prompt += `- Template: ${template.name}\n`;
  prompt += `- Brand: ${brand.name}\n\n`;
  
  prompt += `Input Values:\n`;
  Object.entries(inputValues).forEach(([key, value]) => {
    prompt += `- ${key}: ${value}\n`;
  });
  
  if (section === 'body') {
    prompt += `\nRegenerate the main body content, maintaining the same structure and purpose but improving quality based on feedback.`;
  } else if (section === 'title') {
    prompt += `\nRegenerate a compelling title that captures the essence of the content.`;
  } else if (section === 'meta_description') {
    prompt += `\nRegenerate an SEO-optimized meta description (150-160 characters).`;
  }
  
  return prompt;
}

function isBodyField(field: ParsedTemplateOutputField, outputFields: ParsedTemplateOutputField[]): boolean {
  // Check if this is the primary body field
  const richTextField = outputFields.find(f => f.type === 'richText');
  if (richTextField && field.id === richTextField.id) return true;
  
  // If no rich text field, check if it's the first field
  return outputFields[0]?.id === field.id;
}
