import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { generateTextCompletion } from '@/lib/azure/openai';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

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

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const body = await req.json();
    const validationResult = simplifyClaimsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body.", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { claims, brandName, productName, marketName, mixeraiBrandId } = validationResult.data;

    // --- Permission Check Start ---
    if (mixeraiBrandId) { // Only check if mixeraiBrandId is provided
      const globalRole = user?.user_metadata?.role;
      let hasPermission = globalRole === 'admin';

      if (!hasPermission) {
        const supabase = createSupabaseAdminClient(); // Create client if not admin and needs check
        // @ts-ignore
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('user_brand_permissions')
          .select('brand_id, role')
          .eq('user_id', user.id)
          .eq('brand_id', mixeraiBrandId);

        if (permissionsError) {
          console.error(`[API /ai/claims/simplify] Error fetching brand permissions for user ${user.id}, mixeraiBrandId ${mixeraiBrandId}:`, permissionsError);
          // Potentially critical, but for now, let hasPermission remain false if error occurs
        } else if (permissionsData && permissionsData.length > 0) {
          hasPermission = true; // User has some role on the brand
        }
      }

      if (!hasPermission) {
        console.warn(`[API /ai/claims/simplify] User ${user.id} (global role: ${globalRole}) access denied to simplify claims for brand ${mixeraiBrandId}.`);
        return NextResponse.json(
          { success: false, error: 'You do not have permission to simplify claims for the specified brand.' },
          { status: 403 }
        );
      }
    } else {
      // If mixeraiBrandId is not provided, how should we handle permissions?
      // For now, if it's not provided, we can't tie it to a specific brand permission check.
      // This might mean only global admins can use it without a brandId, or it's a less secure operation.
      // Let's default to requiring it for non-admins, or allowing if no brand context is given (less secure).
      // For safety, if no brandId, only admin. But this might break if client doesn't send it.
      // A better approach might be to make mixeraiBrandId *required* if claims are present and user is not admin.
      // For now, will proceed with: if mixeraiBrandId is present, check it. If not, current logic allows if user is admin.
      // If user is NOT admin AND mixeraiBrandId is NOT provided, they will be blocked if the above `if (mixeraiBrandId)` isn't met AND they are not global admin.
      // So, let's ensure non-admins are blocked if mixeraiBrandId is missing.
      if (user?.user_metadata?.role !== 'admin') {
        console.warn(`[API /ai/claims/simplify] Non-admin user ${user.id} attempted to simplify claims without providing a brand context (mixeraiBrandId).`);
        return NextResponse.json(
          { success: false, error: 'Brand context is required to simplify claims for non-admin users.' },
          { status: 400 } // Bad request, as brand context is needed from client for non-admins
        );
      }
    }
    // --- Permission Check End ---

    // Construct the prompt for the AI
    let systemPrompt = "You are an expert marketing copywriter and legal compliance assistant. " +
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

    return NextResponse.json({ success: true, summary: simplifiedSummary });

  } catch (error: any) {
    console.error("[API /ai/claims/simplify] Error:", error);
    return handleApiError(error, "Failed to simplify claims.");
  }
}); 