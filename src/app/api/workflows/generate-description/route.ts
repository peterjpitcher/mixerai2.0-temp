import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';

// const openai = new OpenAI({ ... }); // Unused OpenAI client initialization removed

const GenerateDescriptionSchema = z.object({
  type: z.enum(['generate', 'polish']),
  stepName: z.string().min(1, 'stepName is required'),
  existingDescription: z.string().optional(),
  otherSteps: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  })).optional(),
  brandContext: z.object({
    brandId: z.string().uuid('brandId must be a valid UUID').optional(),
    name: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
});

export const POST = withAuthMonitoringAndCSRF(async (request: NextRequest, user) => {
  try {
    const payload = await request.json();
    const parsed = GenerateDescriptionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, stepName, existingDescription, otherSteps = [], brandContext } = parsed.data;

    if (type === 'polish' && (!existingDescription || existingDescription.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'existingDescription is required when type is "polish".' },
        { status: 400 }
      );
    }

    if (!process.env.AZURE_OPENAI_API_KEY ||
        !process.env.AZURE_OPENAI_ENDPOINT ||
        !process.env.AZURE_OPENAI_DEPLOYMENT) {
      return NextResponse.json(
        { success: false, error: 'AI service configuration error.' },
        { status: 500 }
      );
    }

    if (brandContext?.brandId) {
      const supabase = createSupabaseAdminClient();
      try {
        await requireBrandAccess(supabase, user, brandContext.brandId);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'You do not have access to the selected brand.' },
            { status: 403 }
          );
        }
        throw error;
      }
    }

    const safeBrandContext = brandContext ? {
      name: brandContext.name?.trim(),
      country: brandContext.country?.trim(),
      language: brandContext.language?.trim(),
    } : undefined;

    let prompt = '';
    let systemMessage = '';
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15'; // Use env var or default

    if (type === 'generate') {
      systemMessage = "You are a concise workflow assistant that creates brief, professional step descriptions. Keep descriptions under 30 words. Be clear and professional, focusing on the purpose of the step.";
      if (safeBrandContext?.name || safeBrandContext?.country || safeBrandContext?.language) {
        const brandDescriptor = [
          safeBrandContext?.name ? `${safeBrandContext.name} brand` : null,
          safeBrandContext?.country ? `operating in ${safeBrandContext.country}` : null,
          safeBrandContext?.language ? `using ${safeBrandContext.language} as the primary language` : null,
        ].filter(Boolean).join(' and ');

        if (brandDescriptor) {
          systemMessage += ` Use language appropriate for ${brandDescriptor}.`;
        }
      }
      let stepsContext = '';
      if (otherSteps.length > 0) {
        stepsContext = 'Other steps in this workflow include: ' +
          otherSteps.map((s) => `"${s.name}" (${s.description || 'No description'})`).join(', ');
      }
      prompt = `Generate a concise professional description (maximum 30 words) for a workflow step named "${stepName}".\n` +
        (stepsContext ? `${stepsContext}\n` : '') +
        (safeBrandContext?.name || safeBrandContext?.country || safeBrandContext?.language
          ? `This is for ${safeBrandContext?.name ?? 'the selected'} brand${safeBrandContext?.country ? ` operating in ${safeBrandContext.country}` : ''}${safeBrandContext?.language ? ` using ${safeBrandContext.language}` : ''}.\n`
          : '') +
        'Keep the description focused on what happens during this step in the content workflow.';
    } 
    else if (type === 'polish') {
      if (!existingDescription) {
        return NextResponse.json(
          { success: false, error: 'Missing existingDescription for polish operation.' },
          { status: 400 }
        );
      }
      systemMessage = "You are a concise professional editor that improves workflow step descriptions. Keep descriptions under 30 words. Maintain the original meaning while making the text more professional, clear, and concise.";
      if (safeBrandContext?.name || safeBrandContext?.country || safeBrandContext?.language) {
        const brandDescriptor = [
          safeBrandContext?.name ? `${safeBrandContext.name} brand` : null,
          safeBrandContext?.country ? `operating in ${safeBrandContext.country}` : null,
          safeBrandContext?.language ? `using ${safeBrandContext.language}` : null,
        ].filter(Boolean).join(' and ');

        if (brandDescriptor) {
          systemMessage += ` Use language appropriate for ${brandDescriptor}.`;
        }
      }
      prompt = `Polish the following workflow step description for the step "${stepName}" while keeping it under 30 words:\n"${existingDescription}"\n` +
        (safeBrandContext?.name || safeBrandContext?.country || safeBrandContext?.language
          ? `This is for ${safeBrandContext?.name ?? 'the selected'} brand${safeBrandContext?.country ? ` operating in ${safeBrandContext.country}` : ''}${safeBrandContext?.language ? ` using ${safeBrandContext.language}` : ''}.\n`
          : '') +
        'Improve clarity, professionalism, and conciseness while preserving the original meaning.';
    } 
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter. Must be \'generate\' or \'polish\'.' },
        { status: 400 }
      );
    }
    
    try {
      const response = await fetch(
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${azureApiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.AZURE_OPENAI_API_KEY || '' 
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.7
          }),
          cache: 'no-store'
        }
      );
      
      if (!response.ok) {
        // const errorText = await response.text(); // Avoid logging raw API error to client-facing logs
        throw new Error(`AI service request failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      let description = responseData.choices?.[0]?.message?.content?.trim() || '';
      description = description.replace(/^["\']|["\']$/g, '');
      
      return NextResponse.json({
        success: true,
        description,
        userId: user.id // Included from withAuthMonitoringAndCSRF
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_aiError) {
      // Error from AI service call. Return a generic error to the client.
      // Specifics of aiError should be logged by a proper server-side logging solution if needed.
      return NextResponse.json(
        { success: false, error: 'AI service failed to generate description. Please try again later.' },
        { status: 503 } // Service Unavailable is appropriate here
      );
    }
  } catch (error) {
    // Catch all for other unexpected errors
    return handleApiError(error, 'Failed to generate description');
  }
}); 
