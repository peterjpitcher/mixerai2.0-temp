import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';
import { generateTemplateDescription } from '@/lib/ai/generate-template-description';
import { withAuthAndCSRF } from '@/lib/api/with-csrf'; // Import the actual AI utility
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { logAiUsage } from '@/lib/audit/ai';

// Define the expected request body schema
const TemplateContextSchema = z.object({
  brand_id: z.string().uuid({ message: 'brand_id must be a valid UUID' }).optional(),
  templateName: z.string().min(1, { message: 'Template name is required' }),
  inputFields: z.array(z.string()).optional(), // Expecting array of field names
  outputFields: z.array(z.string()).optional(), // Expecting array of field names
});



export const POST = withAuthAndCSRF(async function (request: NextRequest, user: User) {
  let requestPayloadSize = 0;
  let brandId: string | null = null;
  try {
    const body = await request.json();
    requestPayloadSize = JSON.stringify(body).length;
    const validationResult = TemplateContextSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { brand_id, templateName, inputFields, outputFields } = validationResult.data;
    brandId = brand_id ?? null;

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

    const generatedDescription = await generateTemplateDescription({
      templateName,
      inputFields,
      outputFields
    });

    if (!generatedDescription) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate template description' },
        { status: 500 }
      );
    }

    await logAiUsage({
      action: 'ai_generate_template_description',
      userId: user.id,
      brandId,
      inputCharCount: requestPayloadSize,
      metadata: {
        responseLength: generatedDescription.trim().length,
      },
    });

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription.trim() // Trim any leading/trailing whitespace from AI output
    });

  } catch (error) {
    console.error('[AI_GENERATE_TEMPLATE_DESCRIPTION_ERROR]', error);
    try {
      await logAiUsage({
        action: 'ai_generate_template_description',
        userId: user.id,
        brandId,
        inputCharCount: requestPayloadSize,
        status: 'error',
        errorMessage: 'Failed to generate template description',
        metadata: {
          cause: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (auditError) {
      console.error('[AI_GENERATE_TEMPLATE_DESCRIPTION_ERROR] Failed to log AI usage', auditError);
      return NextResponse.json(
        { success: false, error: 'Failed to record AI usage event' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate template description' },
      { status: 500 }
    );
  }
}) 
