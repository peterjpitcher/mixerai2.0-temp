import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';
import { generateTextCompletion } from '@/lib/azure/openai';
import { withAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

// Define expected Row types for clarity, aligning with Database types
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
// type CountryRow = Database["public"]["Tables"]["countries"]["Row"]; // Commented out due to missing type in Database

// Define the actual handler function that withAuth will wrap
async function styleProductClaimsHandler(request: NextRequest, user: User) {
  try {
    const body = await request.json();
    const { claims, productId, countryCode } = body;

    if (!Array.isArray(claims)) {
      return NextResponse.json({ success: false, error: 'Claims must be an array.' }, { status: 400 });
    }
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ success: false, error: 'Product ID must be a string.' }, { status: 400 });
    }
    if (!countryCode || typeof countryCode !== 'string') {
      return NextResponse.json({ success: false, error: 'Country code must be a string.' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient(); 

    let productNameFallback = productId;
    let countryNameFallback = countryCode; // Will be used directly as CountryRow is commented out

    if (claims.length === 0) {
      console.log('No raw claims provided to style-product-claims API. Returning empty categorized claims.');
      const { data: productData, error: productError } = await supabase
        .from('products') 
        .select('name')
        .eq('id', productId)
        .maybeSingle();

      // const { data: countryData, error: countryError } = await supabase
      //   .from('countries') 
      //   .select('name')
      //   .eq('code', countryCode)
      //   .maybeSingle(); // Commented out country fetching

      if (productError) console.error("Error fetching product name for empty claims response:", productError.message);
      // if (countryError) console.error("Error fetching country name for empty claims response:", countryError.message);

      return NextResponse.json({
        success: true,
        productName: productData?.name || productNameFallback,
        // countryName: countryData?.name || countryNameFallback, // Using fallback directly
        countryName: countryNameFallback,
        styledAllowedClaims: [],
        styledDisallowedClaims: []
      });
    }

    const claimsForAI = claims.map((claim: any) => ({
      text: claim.claim_text || '',
      type: claim.final_claim_type === 'disallowed' ? 'disallowed' : 'allowed'
    }));

    console.log("--- Claims object being sent to AI for styling ---");
    console.log(JSON.stringify(claimsForAI, null, 2));
    console.log("---------------------------------------------------");

    const systemPrompt = `You are an expert marketing copywriter. Your task is to refine product claims for clarity, conciseness, and impact. 
The input will be a JSON array of claim objects, where each object has a "text" (the claim string) and a "type" ("allowed" or "disallowed").

Please style the text of ALL claims provided.

Then, return a single JSON object with two keys: 
1. "styled_allowed_claims": An array of strings, where each string is a styled "allowed" claim.
2. "styled_disallowed_claims": An array of strings, where each string is a styled "disallowed" claim.

If a category has no claims, return an empty array for that key. Example response format:
{
  "styled_allowed_claims": ["This is a beautifully styled allowed claim.", "Another great allowed claim!"],
  "styled_disallowed_claims": ["This is a clearly rephrased disallowed claim."]
}
Only output this JSON object. Do not include any other text, formatting, or explanations.`;
    
    const userPrompt = `
Product ID: "${productId}"
Country Code: "${countryCode}"

Claims to style and categorize:
---
${JSON.stringify(claimsForAI, null, 2)}
---

Remember to return ONLY the JSON object as specified in the system prompt.
`;

    const aiData = await generateTextCompletion(systemPrompt, userPrompt, 1500, 0.7);

    if (!aiData || typeof aiData !== 'string') {
      console.error('AI processing error: No data or invalid data format from AI', "Raw AI Data:", aiData);
      return NextResponse.json({ success: false, error: 'AI processing failed to return valid data.' }, { status: 500 });
    }

    let parsedAIResponse;
    try {
      const cleanedAiData = aiData.replace(/^```json\n|```json|```$/g, '').trim();
      parsedAIResponse = JSON.parse(cleanedAiData);
      
      if (typeof parsedAIResponse !== 'object' || parsedAIResponse === null || 
          !Array.isArray(parsedAIResponse.styled_allowed_claims) || 
          !parsedAIResponse.styled_allowed_claims.every((item: any) => typeof item === 'string') ||
          !Array.isArray(parsedAIResponse.styled_disallowed_claims) ||
          !parsedAIResponse.styled_disallowed_claims.every((item: any) => typeof item === 'string')) {
         throw new Error('AI response did not conform to the expected JSON object structure with styled_allowed_claims and styled_disallowed_claims arrays of strings.');
      }
    } catch (e: any) {
      console.error("Error parsing AI response object:", aiData, e);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to parse AI response: " + e.message + ". Raw AI output (up to 500 chars): " + aiData.substring(0, 500) + (aiData.length > 500 ? "..." : "") 
      }, { status: 500 });
    }

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .maybeSingle();

    // const { data: countryData, error: countryError } = await supabase
    //   .from('countries')
    //   .select('name')
    //   .eq('code', countryCode)
    //   .maybeSingle(); // Commented out country fetching

    if (productError) console.error("Error fetching product name:", productError.message);
    // if (countryError) console.error("Error fetching country name:", countryError.message);

    const finalResponse = {
      success: true,
      productName: productData?.name || productNameFallback,
      // countryName: countryData?.name || countryNameFallback, // Using fallback directly
      countryName: countryNameFallback,
      styledAllowedClaims: parsedAIResponse.styled_allowed_claims.map((text: string, index: number) => ({
        id: `styled-allowed-${productId}-${countryCode}-${index}`,
        text: text,
      })),
      styledDisallowedClaims: parsedAIResponse.styled_disallowed_claims.map((text: string, index: number) => ({
        id: `styled-disallowed-${productId}-${countryCode}-${index}`,
        text: text,
      })),
    };

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error('Error in /api/ai/style-product-claims handler:', error);
    let errorMessage = 'An unexpected error occurred processing your request.';
    if (error.message) {
        errorMessage = error.message;
    }
    if (process.env.NODE_ENV === 'development' && error.stack) {
        errorMessage += ` (Dev Stack: ${error.stack})`
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Export the wrapped handler
export const POST = withAuth(styleProductClaimsHandler); 