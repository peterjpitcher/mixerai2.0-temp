import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateContentFromTemplate } from '@/lib/azure/openai';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { BrandPermissionVerificationError, userHasBrandAccess } from '@/lib/auth/brand-access';
import { logContentGenerationAudit } from '@/lib/audit/content';
import { enforceContentRateLimits } from '@/lib/rate-limit/content';
import { TemplateFieldsSchema } from '@/lib/schemas/template';
import type { StyledClaims } from '@/types/claims';

// type ContentType = "article" | "retailer_pdp" | "owned_pdp" | string; // Removed

const templateInputValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]).transform((value) => value.toString());

const requestSchema = z.object({
  brand_id: z.string().min(1, 'Brand ID is required'),
  template_id: z.string().optional(),
  input: z
    .object({
      additionalInstructions: z.string().max(5000).optional(),
      templateFields: z.record(templateInputValueSchema).optional(),
      product_context: z
        .union([
          z
            .object({
              productName: z.string().optional(),
              styledClaims: z.any().optional(),
            })
            .strip(),
          z.string(),
          z.null(),
        ])
        .optional(),
    })
    .optional(),
  template: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      inputFields: z
        .array(
          z.object({
            id: z.string(),
            value: templateInputValueSchema.optional(),
          })
        )
        .optional(),
      outputFields: z
        .array(
          z.object({
            id: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
});

export const POST = withAuthMonitoringAndCSRF(async (request: NextRequest, user) => {
  try {
    const parsedBody = requestSchema.safeParse(await request.json());
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

    const data = parsedBody.data;

    const rateLimitResult = await enforceContentRateLimits(request, user.id, data.brand_id);
    if ('type' in rateLimitResult) {
      return NextResponse.json(rateLimitResult.body, {
        status: rateLimitResult.status,
        headers: rateLimitResult.headers,
      });
    }

    const supabase = createSupabaseAdminClient();

    try {
      const hasAccess = await userHasBrandAccess(supabase, user, data.brand_id);
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
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('name, brand_identity, tone_of_voice, guardrails, language, country')
      .eq('id', data.brand_id)
      .single();

    if (brandError || !brandData) {
      console.error('Error fetching brand:', brandError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch brand details or brand not found.' },
        { status: 404 }
      );
    }

    const templateId = data.template?.id ?? data.template_id;
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required for content generation.' },
        { status: 400 }
      );
    }

    const { data: templateRecord, error: templateError } = await supabase
      .from('content_templates')
      .select('id, name, brand_id, fields')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError) {
      console.error('Error fetching template metadata:', templateError);
      return handleApiError(templateError, 'Failed to verify content template.');
    }

    if (!templateRecord) {
      return NextResponse.json(
        { success: false, error: 'Template not found.' },
        { status: 404 }
      );
    }

    if (templateRecord.brand_id && templateRecord.brand_id !== data.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Template does not belong to the selected brand.' },
        { status: 403 }
      );
    }

    let parsedFields;
    try {
      parsedFields = TemplateFieldsSchema.parse(templateRecord.fields ?? {});
    } catch (schemaError) {
      console.error('Template field schema validation failed:', schemaError);
      return NextResponse.json(
        { success: false, error: 'Template configuration is invalid. Please contact an administrator.' },
        { status: 422 }
      );
    }

    const providedInputValues = new Map<string, string>();
    if (Array.isArray(data.template?.inputFields)) {
      for (const field of data.template.inputFields) {
        if (field && typeof field.id === 'string' && field.value !== undefined && field.value !== null) {
          providedInputValues.set(field.id, String(field.value));
        }
      }
    }

    if (data.input?.templateFields) {
      for (const [fieldId, value] of Object.entries(data.input.templateFields)) {
        providedInputValues.set(fieldId, value);
      }
    }

    const sanitizedInputFields = parsedFields.inputFields.map((field) => ({
      ...field,
      value: providedInputValues.get(field.id) ?? '',
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

    if (parsedFields.outputFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template is missing output fields and cannot be used for generation.' },
        { status: 400 }
      );
    }

    const templateForGeneration = {
      id: templateRecord.id,
      name: templateRecord.name,
      inputFields: sanitizedInputFields,
      outputFields: parsedFields.outputFields.map((field) => ({ ...field })),
    };

    const brandInfoForGeneration = {
      name: brandData.name,
      brand_identity: brandData.brand_identity,
      tone_of_voice: brandData.tone_of_voice,
      guardrails: brandData.guardrails,
      language: brandData.language || 'en',
      country: brandData.country || 'US',
    };

    const sanitizedInput: {
      additionalInstructions?: string;
      templateFields?: Record<string, string>;
      product_context?: { productName?: string; styledClaims: StyledClaims | null };
    } = {};

    if (data.input?.additionalInstructions) {
      sanitizedInput.additionalInstructions = data.input.additionalInstructions;
    }

    if (providedInputValues.size > 0) {
      sanitizedInput.templateFields = Object.fromEntries(providedInputValues.entries());
    }

    if (data.input?.product_context) {
      try {
        if (typeof data.input.product_context === 'string') {
          const parsed = JSON.parse(data.input.product_context);
          if (parsed && typeof parsed === 'object') {
            sanitizedInput.product_context = {
              productName: typeof parsed.productName === 'string' ? parsed.productName : undefined,
              styledClaims: parsed.styledClaims ?? null,
            };
          }
        } else if (typeof data.input.product_context === 'object') {
          sanitizedInput.product_context = {
            productName:
              data.input.product_context.productName &&
              typeof data.input.product_context.productName === 'string'
                ? data.input.product_context.productName
                : undefined,
            styledClaims: (data.input.product_context as { styledClaims?: StyledClaims | null }).styledClaims ?? null,
          };
        }
      } catch (contextError) {
        console.error('Failed to parse product_context payload:', contextError);
      }
    }

    try {
      const generatedOutputs = await generateContentFromTemplate(
        brandInfoForGeneration,
        templateForGeneration,
        sanitizedInput
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('[api/content/generate] generatedOutputs', generatedOutputs);
      }

      const responsePayload = {
        success: true,
        userId: user.id,
        generatedOutputs,
      };

      await logContentGenerationAudit({
        action: 'content_generate_template',
        userId: user.id,
        brandId: data.brand_id,
        templateId: templateRecord.id,
        metadata: {
          templateName: templateRecord.name,
          inputFieldCount: sanitizedInputFields.length,
          outputFieldCount: parsedFields.outputFields.length,
        },
      });

      return NextResponse.json(responsePayload);
    } catch (templateError) {
      console.error('Error during generateContentFromTemplate:', templateError);
      return handleApiError(templateError, 'Failed to generate content from template');
    }

  } catch (error) {
    console.error('Generic error in content generation POST handler:', error);
    return handleApiError(error, 'Failed to generate content');
  }
}); 
