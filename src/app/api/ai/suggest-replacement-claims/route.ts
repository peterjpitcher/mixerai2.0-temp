import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { generateTextCompletion } from '@/lib/azure/openai';
import { ClaimTypeEnum, Product, MasterClaimBrand as MasterClaimBrandSummary } from '@/lib/claims-utils';

export const dynamic = "force-dynamic";

// Interface for the full brand details from the 'brands' table
interface BrandDetails {
    id: string;
    name: string;
    website_url?: string | null;
    country?: string | null; // Brand's origin country
    language?: string | null; // Brand's primary language
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
    // Add other fields from the 'brands' table as needed for the AI prompt
}

interface SuggestReplacementClaimsRequest {
    masterClaimText: string;
    masterClaimType: ClaimTypeEnum;
    targetMarketCountryCode: string;
    productId: string;
    maxSuggestions?: number;
}

interface AISuggestion {
    claim_text: string;
    claim_type: ClaimTypeEnum;
    reasoning?: string;
}

interface SuggestReplacementClaimsResponse {
    success: boolean; // Added success field
    suggestions?: AISuggestion[];
    error?: string; // Optional error field
}

async function getProductAndFullBrandDetails(supabase: any, productId: string): Promise<{ product: Product | null, brandDetails: BrandDetails | null }> {
    let product: Product | null = null;
    let brandDetails: BrandDetails | null = null;

    // @ts-ignore
    const { data: productData, error: productError } = await supabase
        .from('products')
        // @ts-ignore 
        .select('*, master_brand_id(*)') // Renamed from global_claim_brand_id
        .eq('id', productId)
        .single();

    if (productError) {
        console.error(`[AI Suggest] Error fetching product ${productId}:`, productError);
        return { product, brandDetails }; // Return nulls if product fetch fails
    }

    if (productData) {
        product = productData as Product;
        // @ts-ignore 
        const masterClaimBrandSummary = productData.master_brand_id as MasterClaimBrandSummary; // Renamed

        if (masterClaimBrandSummary && masterClaimBrandSummary.mixerai_brand_id) {
            // 2. Fetch full brand details from 'brands' table using mixerai_brand_id
            // @ts-ignore
            const { data: fullBrandData, error: brandError } = await supabase
                .from('brands') // The main brands table
                .select('id, name, website_url, country, language, brand_identity, tone_of_voice, guardrails')
                .eq('id', masterClaimBrandSummary.mixerai_brand_id)
                .single();

            if (brandError) {
                console.warn(`[AI Suggest] Could not fetch full brand details for mixerai_brand_id ${masterClaimBrandSummary.mixerai_brand_id}:`, brandError);
                // Proceed without full brand details if this fetch fails
            } else if (fullBrandData) {
                brandDetails = fullBrandData as BrandDetails;
            }
        }
    }
    return { product, brandDetails };
}

export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body: SuggestReplacementClaimsRequest = await req.json();
        const {
            masterClaimText,
            masterClaimType,
            targetMarketCountryCode,
            productId,
            maxSuggestions = 3,
        } = body;

        if (!masterClaimText || !masterClaimType || !targetMarketCountryCode || !productId) {
            return NextResponse.json<SuggestReplacementClaimsResponse>({ success: false, error: 'Missing required fields.' }, { status: 400 });
        }

        if (isBuildPhase()) {
            console.log('[AI Suggest] Build phase: returning empty suggestions.');
            return NextResponse.json<SuggestReplacementClaimsResponse>({ success: true, suggestions: [] });
        }

        const supabase = createSupabaseAdminClient();
        const { product, brandDetails } = await getProductAndFullBrandDetails(supabase, productId);

        if (!product) {
            return NextResponse.json<SuggestReplacementClaimsResponse>({ success: false, error: `Product with ID ${productId} not found.` }, { status: 404 });
        }

        const systemPrompt = `You are an expert marketing compliance assistant specializing in product claims for the brand "${brandDetails?.name || 'this brand'}". Your task is to suggest suitable market-specific replacement claims. Adhere strictly to the brand's identity, tone of voice, and guardrails if provided. The suggestions must be valid for the target market. Return JSON.`;
        
        let userPrompt = `The master (global) claim is:\nText: "${masterClaimText}"\nType: "${masterClaimType}"\n\nThis master claim needs to be overridden for the product "${product.name}" (ID: ${product.id}) in the target market: ${targetMarketCountryCode}.\n\n`;

        if (brandDetails) {
            userPrompt += `Brand Information:\n`;
            if (brandDetails.name) userPrompt += `- Brand Name: ${brandDetails.name}\n`;
            if (brandDetails.brand_identity) userPrompt += `- Identity: ${brandDetails.brand_identity}\n`;
            if (brandDetails.tone_of_voice) userPrompt += `- Tone of Voice: ${brandDetails.tone_of_voice}\n`;
            if (brandDetails.guardrails) userPrompt += `- Guardrails: ${brandDetails.guardrails}\n`;
            if (brandDetails.language) userPrompt += `- Brand Language: ${brandDetails.language}\n`; // Primary language of the brand
            if (brandDetails.country) userPrompt += `- Brand Origin Country: ${brandDetails.country}\n`; // Origin country of the brand
        }
        if (product.description) {
             userPrompt += `\nProduct Description: ${product.description}\n`;
        }

        userPrompt += `\nPlease suggest up to ${maxSuggestions} replacement claims suitable for ${targetMarketCountryCode}. For each suggestion, provide the claim text, claim type (must be one of 'allowed', 'disallowed', 'mandatory'), and a brief reasoning. Format your response as a JSON object with a single key "suggestions", which is an array of objects, each with "claim_text", "claim_type", and "reasoning" keys. Ensure claim_type is valid.`;
        
        console.log(`[AI Suggest] System Prompt for ${productId}: ${systemPrompt.substring(0,100)}...`);
        console.log(`[AI Suggest] User Prompt for ${productId}: ${userPrompt.substring(0,200)}...`);

        let suggestions: AISuggestion[] = [];
        try {
            const aiResponse = await generateTextCompletion(systemPrompt, userPrompt, 1000, 0.7);
            if (aiResponse) {
                console.log(`[AI Suggest] Raw AI Response for ${productId}: ${aiResponse.substring(0,300)}...`);
                try {
                    const parsed = JSON.parse(aiResponse);
                    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                        suggestions = parsed.suggestions.filter(
                            (s: any) => s.claim_text && s.claim_type && ['allowed', 'disallowed', 'mandatory'].includes(s.claim_type)
                        ).slice(0, maxSuggestions) as AISuggestion[];
                         console.log(`[AI Suggest] Parsed ${suggestions.length} valid suggestions for ${productId}.`);
                    } else {
                        console.warn(`[AI Suggest] AI response for ${productId} was not in the expected JSON format (missing suggestions array): ${aiResponse.substring(0,300)}`);
                    }
                } catch (parseError) {
                    console.error(`[AI Suggest] Failed to parse AI JSON response for ${productId}: ${parseError}. Raw response: ${aiResponse.substring(0,300)}`);
                }
            } else {
                console.warn(`[AI Suggest] Received null or empty response from generateTextCompletion for ${productId}.`);
            }
        } catch (aiError) {
            console.error(`[AI Suggest] Error during AI suggestion generation for ${productId}: `, aiError);
            throw aiError;
        }

        return NextResponse.json<SuggestReplacementClaimsResponse>({ success: true, suggestions });

    } catch (error: any) {
        console.error('[AI Suggest] Catched error in POST handler:', error);
        if (error.message && error.message.includes("Azure OpenAI endpoint or API key is missing")) {
             return NextResponse.json<SuggestReplacementClaimsResponse>({ success: false, error: "AI service is not configured." }, { status: 503 });
        }
        // Use handleApiError but ensure its response shape is SuggestReplacementClaimsResponse if needed, or construct manually.
        // For now, assuming handleApiError returns a structure that might not perfectly match {success: false, error: string}.
        // So, it might be better to return a known shape directly for consistency if handleApiError is too generic.
        const errorMessage = error.message || 'An unexpected error occurred while suggesting replacement claims.';
        return NextResponse.json<SuggestReplacementClaimsResponse>({ success: false, error: errorMessage }, { status: 500 });
    }
}); 