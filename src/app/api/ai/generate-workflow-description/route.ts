import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';
import { generateWorkflowDescription } from '@/lib/ai/generate-workflow-description';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { logAiUsage } from '@/lib/audit/ai';

// Define the expected request body schema
const WorkflowDetailsSchema = z.object({
  brand_id: z.string().uuid({ message: 'brand_id must be a valid UUID' }).optional(),
  workflowName: z.string().min(1, { message: 'Workflow name is required' }),
  brandName: z.string().optional(),
  templateName: z.string().optional(),
  stepNames: z.array(z.string()).optional(),
  brandCountry: z.string().optional(),
  brandLanguage: z.string().optional(),
});

export const POST = withAuthAndCSRF(async function (request: NextRequest, user: User) {
  let requestPayloadSize = 0;
  let brandId: string | null = null;
  try {
    const body = await request.json();
    requestPayloadSize = JSON.stringify(body).length;
    const validationResult = WorkflowDetailsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { brand_id, workflowName, brandName, templateName, stepNames, brandCountry, brandLanguage } = validationResult.data;
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

    const generatedDescription = await generateWorkflowDescription({
      workflowName,
      brandName,
      templateName,
      stepNames,
      brandCountry,
      brandLanguage,
    });

    if (!generatedDescription) {
      console.error('[API_GENERATE_WORKFLOW_DESCRIPTION] AI generation failed or returned null.');
      return NextResponse.json(
        { success: false, error: 'AI failed to generate workflow description. Please try again later.' },
        { status: 503 } // Service Unavailable
      );
    }

    const trimmed = generatedDescription.trim();

    await logAiUsage({
      action: 'ai_generate_workflow_description',
      userId: user.id,
      brandId,
      inputCharCount: requestPayloadSize,
      metadata: {
        responseLength: trimmed.length,
        stepCount: stepNames?.length ?? 0,
      },
    });

    return NextResponse.json({ 
      success: true, 
      description: trimmed 
    });

  } catch (error) {
    console.error('[API_GENERATE_WORKFLOW_DESCRIPTION_ERROR]', error);
    // Check if the error is a Zod validation error for more specific client feedback
    if (error instanceof z.ZodError) {
        return NextResponse.json(
            { success: false, error: 'Invalid request payload.', details: error.format() },
            { status: 400 }
        );
    }
    try {
      await logAiUsage({
        action: 'ai_generate_workflow_description',
        userId: user.id,
        brandId,
        inputCharCount: requestPayloadSize,
        status: 'error',
        errorMessage: 'Failed to generate workflow description',
        metadata: {
          cause: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (auditError) {
      console.error('[API_GENERATE_WORKFLOW_DESCRIPTION_ERROR] Failed to log AI usage', auditError);
      return NextResponse.json(
        { success: false, error: 'Failed to record AI usage event.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while generating the workflow description.' },
      { status: 500 }
    );
  }
}) 
