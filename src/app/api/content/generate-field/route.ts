import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';

import { generateTextCompletion } from '@/lib/azure/openai';
import { normalizeFieldContent, type NormalizedContent } from '@/lib/content/html-normalizer';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { logContentGenerationAudit } from '@/lib/audit/content';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';
import {
  calculateMaxTokens,
  processAIResponse,
  type FieldConstraints,
  type TemplateField,
} from '@/lib/ai/constrained-generation';
import { TemplateFieldsSchema } from '@/lib/schemas/template';
import type { Brand } from '@/types/models';

const MAX_TEMPLATE_VALUE_LENGTH = 8000;
const MAX_EXISTING_OUTPUT_LENGTH = 20000;

const normalizedContentInputSchema = z
  .object({
    html: z.string().optional(),
    plain: z.string().optional(),
    wordCount: z.number().optional(),
    charCount: z.number().optional(),
  })
  .refine((value) => typeof value.html === 'string' || typeof value.plain === 'string', {
    message: 'Normalized content must include html or plain text',
  });

const requestSchema = z.object({
  brand_id: z.string().uuid('brand_id must be a valid UUID'),
  template_id: z.string().uuid('template_id must be a valid UUID'),
  output_field_to_generate_id: z.string().min(1, 'output_field_to_generate_id is required'),
  template_field_values: z
    .record(z.string().max(MAX_TEMPLATE_VALUE_LENGTH, 'template field values must be 8000 characters or fewer'))
    .optional(),
  existing_outputs: z
    .record(
      z.union([
        z.string().max(
          MAX_EXISTING_OUTPUT_LENGTH,
          'existing output values must be 20000 characters or fewer'
        ),
        normalizedContentInputSchema,
      ])
    )
    .optional(),
});

const clampString = (value: string, limit: number) => (value.length > limit ? value.slice(0, limit) : value);

const interpolatePrompt = (
  promptText: string,
  templateFieldValues: Record<string, string>,
  existingOutputs: Record<string, string>,
  brandDetails: Pick<Brand, 'name' | 'brand_identity' | 'tone_of_voice' | 'guardrails'> | null
): string => {
  let interpolated = promptText;

  Object.entries(templateFieldValues).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`, 'g');
    interpolated = interpolated.replace(placeholder, value);
  });

  Object.entries(existingOutputs).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`, 'g');
    interpolated = interpolated.replace(placeholder, value);
  });

  if (brandDetails) {
    interpolated = interpolated.replace(/{{brand\.name}}/g, brandDetails.name ?? '');
    interpolated = interpolated.replace(/{{brand\.identity}}/g, brandDetails.brand_identity ?? '');
    interpolated = interpolated.replace(/{{brand\.tone_of_voice}}/g, brandDetails.tone_of_voice ?? '');
    interpolated = interpolated.replace(/{{brand\.guardrails}}/g, brandDetails.guardrails ?? '');
    interpolated = interpolated.replace(/{{brand\.summary}}/g, brandDetails.brand_identity ?? '');
    interpolated = interpolated.replace(
      /{{brand}}/g,
      JSON.stringify({
        name: brandDetails.name,
        identity: brandDetails.brand_identity,
        tone_of_voice: brandDetails.tone_of_voice,
        guardrails: brandDetails.guardrails,
      })
    );

    interpolated = interpolated.replace(/{{Brand Name}}/g, brandDetails.name ?? '');
    interpolated = interpolated.replace(/{{Brand Identity}}/g, brandDetails.brand_identity ?? '');
    interpolated = interpolated.replace(/{{Tone of Voice}}/g, brandDetails.tone_of_voice ?? '');
    interpolated = interpolated.replace(/{{Guardrails}}/g, brandDetails.guardrails ?? '');
  }

  return interpolated;
};

export const POST = withAuthAndCSRF(async (req: NextRequest, user: User): Promise<Response> => {
  const supabase = createSupabaseAdminClient();

  try {
    const parsedBody = requestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      brand_id,
      template_id,
      output_field_to_generate_id,
      template_field_values = {},
      existing_outputs = {},
    } = parsedBody.data;

    const rateLimitResult = await enforceContentRateLimits(req, user.id, brand_id);
    if ('type' in rateLimitResult) {
      return NextResponse.json(rateLimitResult.body, {
        status: rateLimitResult.status,
        headers: rateLimitResult.headers,
      });
    }

    try {
      const hasAccess = await userHasBrandAccess(supabase, user, brand_id);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'You do not have access to this brand.' },
          { status: 403 }
        );
      }
    } catch (error) {
      if (error instanceof BrandPermissionVerificationError) {
        return NextResponse.json(
          { success: false, error: 'Unable to verify brand permissions. Please try again later.' },
          { status: 500 }
        );
      }
      throw error;
    }

    const [{ data: templateRecord, error: templateError }, { data: brandRecord, error: brandError }] =
      await Promise.all([
        supabase
          .from('content_templates')
          .select('id, name, brand_id, fields')
          .eq('id', template_id)
          .maybeSingle(),
        supabase
          .from('brands')
          .select('id, name, brand_identity, tone_of_voice, guardrails, language, country')
          .eq('id', brand_id)
          .maybeSingle(),
      ]);

    if (templateError) {
      console.error('[generate-field] Error fetching template details:', templateError);
      throw templateError;
    }
    if (!templateRecord) {
      return NextResponse.json({ success: false, error: 'Content template not found' }, { status: 404 });
    }

    if (templateRecord.brand_id && templateRecord.brand_id !== brand_id) {
      return NextResponse.json(
        { success: false, error: 'Template does not belong to the selected brand.' },
        { status: 403 }
      );
    }

    if (brandError) {
      console.error('[generate-field] Error fetching brand details:', brandError);
      throw brandError;
    }
    if (!brandRecord) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }

    let parsedTemplateFields;
    try {
      parsedTemplateFields = TemplateFieldsSchema.parse(templateRecord.fields ?? {});
    } catch (error) {
      console.error('[generate-field] Template fields failed validation:', error);
      return NextResponse.json(
        { success: false, error: 'Template configuration is invalid. Please contact an administrator.' },
        { status: 422 }
      );
    }

    const inputValuesById = new Map<string, string>();
    Object.entries(template_field_values).forEach(([key, value]) => {
      inputValuesById.set(key, clampString(value, MAX_TEMPLATE_VALUE_LENGTH));
    });

    const sanitizedInputFields = parsedTemplateFields.inputFields.map((field) => ({
      ...field,
      value: inputValuesById.get(field.id) ?? '',
    }));

    const missingRequiredInputs = sanitizedInputFields.filter(
      (field) => field.required && !(field.value && field.value.toString().trim().length > 0)
    );

    if (missingRequiredInputs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required template inputs are missing.',
          missingFields: missingRequiredInputs.map((field) => field.name || field.id),
        },
        { status: 400 }
      );
    }

    const outputFieldToGenerate = parsedTemplateFields.outputFields.find(
      (field) => field.id === output_field_to_generate_id
    );

    if (!outputFieldToGenerate) {
      return NextResponse.json(
        { success: false, error: `Output field with ID ${output_field_to_generate_id} not found in template.` },
        { status: 404 }
      );
    }

    if (!outputFieldToGenerate.aiPrompt) {
      return NextResponse.json(
        { success: false, error: `Output field ${outputFieldToGenerate.name} does not have an AI prompt configured.` },
        { status: 400 }
      );
    }

    const templatePlaceholderValues: Record<string, string> = {};
    sanitizedInputFields.forEach((field) => {
      const value = field.value ?? '';
      templatePlaceholderValues[field.id] = value;
      if (field.name) {
        templatePlaceholderValues[field.name] = value;
      }
    });

    const existingOutputValues: Record<string, string> = {};
    parsedTemplateFields.outputFields.forEach((field) => {
      const rawValue = existing_outputs[field.id] ?? (field.name ? existing_outputs[field.name] : undefined);
      if (!rawValue) {
        return;
      }

      let normalized: NormalizedContent | null = null;
      if (typeof rawValue === 'string') {
        normalized = normalizeFieldContent(rawValue, field.type);
      } else if (typeof rawValue === 'object') {
        const candidate = (rawValue as { html?: string; plain?: string }).html ?? (rawValue as { html?: string; plain?: string }).plain ?? '';
        normalized = normalizeFieldContent(candidate, field.type);
      }

      if (!normalized) {
        return;
      }

      const primaryValue = field.type === 'richText' || field.type === 'html' ? normalized.html : normalized.plain;
      const truncatedPrimary = clampString(primaryValue, MAX_EXISTING_OUTPUT_LENGTH);
      existingOutputValues[field.id] = truncatedPrimary;
      if (field.name) {
        existingOutputValues[field.name] = truncatedPrimary;
      }

      const truncatedPlain = clampString(normalized.plain, MAX_EXISTING_OUTPUT_LENGTH);
      const truncatedHtml = clampString(normalized.html, MAX_EXISTING_OUTPUT_LENGTH);
      existingOutputValues[`${field.id}_plain`] = truncatedPlain;
      existingOutputValues[`${field.id}_html`] = truncatedHtml;
      if (field.name) {
        existingOutputValues[`${field.name}_plain`] = truncatedPlain;
        existingOutputValues[`${field.name}_html`] = truncatedHtml;
      }
    });

    const brandContext = {
      name: brandRecord.name,
      brand_identity: brandRecord.brand_identity,
      tone_of_voice: brandRecord.tone_of_voice,
      guardrails: brandRecord.guardrails,
      language: brandRecord.language ?? 'en',
      country: brandRecord.country ?? 'US',
    };

    const baseFieldSpecificInstructions = interpolatePrompt(
      outputFieldToGenerate.aiPrompt,
      templatePlaceholderValues,
      existingOutputValues,
      brandRecord
    );

    let contextualizedUserPrompt = '';
    const INDENT = '  ';

    contextualizedUserPrompt += `BRAND CONTEXT:\n`;
    contextualizedUserPrompt += `${INDENT}Brand Name: ${brandContext.name}\n`;
    if (brandRecord.brand_identity) {
      contextualizedUserPrompt += `${INDENT}Brand Identity:\n${INDENT}${INDENT}${brandRecord.brand_identity
        .split('\\n')
        .join(`\\n${INDENT}${INDENT}`)}\n`;
    }
    if (brandRecord.tone_of_voice) {
      contextualizedUserPrompt += `${INDENT}Tone of Voice: ${brandRecord.tone_of_voice}\n`;
    }
    if (brandRecord.guardrails) {
      contextualizedUserPrompt += `${INDENT}Brand Guardrails:\n${INDENT}${INDENT}${brandRecord.guardrails
        .split('\\n')
        .join(`\\n${INDENT}${INDENT}`)}\n`;
    }
    contextualizedUserPrompt += `\nTASK TO PERFORM:\n`;
    contextualizedUserPrompt += `${INDENT}You are generating content *only* for the field named "${outputFieldToGenerate.name}".\n`;
    contextualizedUserPrompt += `${INDENT}Adhere to the brand context provided above.\n`;
    contextualizedUserPrompt += `${INDENT}Use the following instructions and input data (if any) to generate the content for this field:\n\n`;
    contextualizedUserPrompt += baseFieldSpecificInstructions;

    const fieldOptions = outputFieldToGenerate.options || {};
    const constraints: FieldConstraints = {};

    if (outputFieldToGenerate.type === 'plainText' && 'maxLength' in fieldOptions) {
      constraints.max_length = fieldOptions.maxLength as number;
    } else if (outputFieldToGenerate.type === 'richText') {
      if ('maxLength' in fieldOptions) {
        constraints.max_length = fieldOptions.maxLength as number;
      }
      if ('maxRows' in fieldOptions) {
        constraints.max_rows = fieldOptions.maxRows as number;
      }
    }

    const templateField: TemplateField = {
      name: outputFieldToGenerate.name,
      type:
        outputFieldToGenerate.type === 'plainText'
          ? 'short_text'
          : outputFieldToGenerate.type === 'richText'
          ? 'long_text'
          : 'long_text',
      config: constraints,
    };

    let constraintInstructions = '';
    if (constraints.max_length) {
      constraintInstructions += `\n\nCRITICAL REQUIREMENT: The response MUST be ${constraints.max_length} characters or less. This is mandatory.`;
    }
    if (constraints.max_rows) {
      constraintInstructions += `\nMAXIMUM LINES: ${constraints.max_rows} lines/rows only. Do not exceed this limit.`;
    }

    const enhancedUserPrompt = contextualizedUserPrompt + constraintInstructions;
    const systemPrompt = `You are an AI assistant specialized in generating specific pieces of marketing content based on detailed instructions and brand context. Your goal is to produce accurate, high-quality text for the requested field ONLY. Do not add conversational fluff or any introductory/concluding remarks beyond the direct content for the field.${constraintInstructions ? ' IMPORTANT: You MUST respect all character and line limits specified.' : ''}`;

    let singleFieldMaxTokens = calculateMaxTokens(constraints.max_length);
    if (!singleFieldMaxTokens) {
      if (outputFieldToGenerate.type === 'richText') {
        singleFieldMaxTokens = 1000;
      } else if (outputFieldToGenerate.type === 'html') {
        singleFieldMaxTokens = 1500;
      } else {
        singleFieldMaxTokens = 250;
      }
    }

    const temperature = constraints.max_length || constraints.max_rows ? 0.3 : 0.7;

    let generatedText: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !generatedText) {
      attempts += 1;

      const rawResponse = await generateTextCompletion(
        systemPrompt,
        enhancedUserPrompt +
          (attempts > 1
            ? `\n\nPREVIOUS ATTEMPT FAILED: Response exceeded constraints. Generate a shorter response that fits within ${constraints.max_length || 'the specified'} characters.`
            : ''),
        singleFieldMaxTokens,
        temperature
      );

      if (!rawResponse) {
        console.error(`[generate-field] AI generation attempt ${attempts} returned no content for field ${outputFieldToGenerate.name}`);
        continue;
      }

      const processed = processAIResponse(rawResponse, templateField);

      if (processed.warnings.length === 0 || attempts === maxAttempts) {
        generatedText = processed.value;
        if (processed.warnings.length > 0) {
          console.warn(`[generate-field] Using truncated response after ${attempts} attempts for field ${outputFieldToGenerate.name}:`, processed.warnings);
        }
      } else {
        console.warn(`[generate-field] Attempt ${attempts} violated constraints for field ${outputFieldToGenerate.name}:`, processed.warnings);
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        { success: false, error: `AI failed to generate content within constraints for field: ${outputFieldToGenerate.name}` },
        { status: 500 }
      );
    }

    await logContentGenerationAudit({
      action: 'content_generate_field',
      userId: user.id,
      brandId: brand_id,
      templateId: template_id,
      metadata: {
        fieldId: output_field_to_generate_id,
        attempts,
        constraints: templateField.config,
      },
    });

    const generatedContent = normalizeFieldContent(generatedText, outputFieldToGenerate.type);

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/content/generate-field] generatedContent', generatedContent);
    }

    return NextResponse.json({
      success: true,
      generated_content: generatedContent,
      output_field_id: output_field_to_generate_id,
      field_name: outputFieldToGenerate.name,
      attempts_made: attempts,
    });
  } catch (error) {
    console.error('[generate-field] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
