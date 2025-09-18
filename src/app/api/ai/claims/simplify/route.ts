import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { generateTextCompletion } from '@/lib/azure/openai';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { BrandPermissionVerificationError, requireBrandAccess } from '@/lib/auth/brand-access';
import { logAiUsage } from '@/lib/audit/ai';

export const dynamic = "force-dynamic";

const simplifyClaimsSchema = z.object({
  claims: z.array(z.object({
    claim_text: z.string(),
    final_claim_type: z.string(), // Keeping it simple for the AI, can be more specific if needed
    source_level: z.string(),
    description: z.string().optional().nullable(),
    is_blocked_override: z.boolean().optional(),
    is_replacement_override: z.boolean().optional(),
  })).min(1, "At least one claim is required for simplification."),
  brandName: z.string().optional(),
  productName: z.string().optional(),
  marketName: z.string().optional(),
  mixeraiBrandId: z.string().uuid().optional(),
});

export const POST = withAuthAndCSRF(async (req: NextRequest, user: User): Promise<Response> => {
  let requestPayloadSize = 0;
  let brandId: string | null = null;
  try {
    const body = await req.json();
    requestPayloadSize = JSON.stringify(body).length;
    const validationResult = simplifyClaimsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body.", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { claims, brandName, productName, marketName, mixeraiBrandId } = validationResult.data;
    brandId = mixeraiBrandId ?? null;

    // --- Permission Check Start ---
    const supabase = createSupabaseAdminClient();

    if (mixeraiBrandId) { // Only check if mixeraiBrandId is provided
      try {
        await requireBrandAccess(supabase, user, mixeraiBrandId);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions. Please try again later.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          console.warn(`[API /ai/claims/simplify] User ${user.id} denied access for brand ${mixeraiBrandId}.`);
          return NextResponse.json(
            { success: false, error: 'You do not have permission to simplify claims for the specified brand.' },
            { status: 403 }
          );
        }
        throw error;
      }
    } else if (user?.user_metadata?.role !== 'admin') {
      console.warn(`[API /ai/claims/simplify] Non-admin user ${user.id} attempted to simplify claims without providing a brand context (mixeraiBrandId).`);
      return NextResponse.json(
        { success: false, error: 'Brand context is required to simplify claims for non-admin users.' },
        { status: 400 }
      );
    }
    // --- Permission Check End ---

    // Construct the prompt for the AI
    const systemPrompt = "You are an expert marketing copywriter and legal compliance assistant. " +
                       "Your task is to simplify a list of marketing claims into a concise, human-readable summary. " +
                       "Focus on clarity and accuracy. The summary should be easy for a brand manager to understand quickly.";

    let userPrompt = `Please simplify the following list of effective marketing claims`;
    if (productName) userPrompt += ` for the product "${productName}"`;
    if (brandName) userPrompt += ` from brand "${brandName}"`;
    if (marketName) userPrompt += ` in the "${marketName}" market`;
    userPrompt += ".\n\nEffective Claims:\n";

    claims.forEach((claim, index) => {
      userPrompt += `${index + 1}. Claim Text: "${claim.claim_text}"\n`;
      userPrompt += `   - Status: ${claim.final_claim_type.toUpperCase()}\n`;
      userPrompt += `   - Source: ${claim.source_level}\n`;
      if (claim.is_blocked_override) userPrompt += `   - Note: This was a master claim that is BLOCKED in this market.\n`;
      if (claim.is_replacement_override) userPrompt += `   - Note: This is a REPLACEMENT for a master claim in this market.\n`;
      if (claim.description) userPrompt += `   - Original Description: ${claim.description}\n`;
      userPrompt += "\n";
    });

    userPrompt += "Provide a summary that highlights the key allowed claims, notes any critical disallowed or mandatory claims, and gives an overall picture of what can be said about the product in this market. Avoid technical jargon from the input unless essential.";
    
    // console.log("[API /ai/claims/simplify] System Prompt:", systemPrompt);
    // console.log("[API /ai/claims/simplify] User Prompt:", userPrompt);

    const simplifiedSummary = await generateTextCompletion(systemPrompt, userPrompt, 500, 0.7);

    if (!simplifiedSummary) {
      return NextResponse.json(
        { success: false, error: "The AI service failed to generate a summary." },
        { status: 500 }
      );
    }

    await logAiUsage({
      action: 'ai_simplify_claims',
      userId: user.id,
      brandId,
      inputCharCount: requestPayloadSize,
      metadata: {
        claimCount: claims.length,
        summaryLength: simplifiedSummary.length,
        productName,
        marketName,
      },
    });

    return NextResponse.json({ success: true, summary: simplifiedSummary });

  } catch (error: unknown) {
    console.error("[API /ai/claims/simplify] Error:", error);
    try {
      await logAiUsage({
        action: 'ai_simplify_claims',
        userId: user.id,
        brandId,
        inputCharCount: requestPayloadSize,
        status: 'error',
        errorMessage: 'Failed to simplify claims.',
        metadata: {
          cause: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (auditError) {
      console.error('[API /ai/claims/simplify] Failed to log AI usage', auditError);
      return handleApiError(auditError, 'Failed to record AI usage event.', 500);
    }
    return handleApiError(error, "Failed to simplify claims.");
  }
}); 
