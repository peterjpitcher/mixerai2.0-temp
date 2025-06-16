import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { generateTextCompletion } from '@/lib/azure/openai';
import { withAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

type Claim = {
  claim_text: string;
  claim_type: 'mandatory' | 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

// Function to fetch all claims related to a master claim brand
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | null, countryCode: string | null): Promise<Claim[]> {
  // @ts-expect-error RPC function type not yet in generated types
  const { data, error } = await supabase.rpc('get_all_claims_for_master_brand', {
    master_brand_id_param: masterClaimBrandId,
    product_id_param: productId,
    country_code_param: countryCode
  });

  if (error) {
    console.error('Error fetching all brand claims:', error);
    throw new Error('Failed to fetch claims for the brand.');
  }

  return data as Claim[];
}

// Custom sort function for claims
function sortClaims(a: Claim, b: Claim): number {
  // 1. Mandatory claims first
  if (a.claim_type === 'mandatory' && b.claim_type !== 'mandatory') return -1;
  if (a.claim_type !== 'mandatory' && b.claim_type === 'mandatory') return 1;

  // 2. Level order: product > ingredient > brand
  const levelOrder = { product: 1, ingredient: 2, brand: 3 };
  const aLevel = levelOrder[a.level];
  const bLevel = levelOrder[b.level];
  if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }

  // 3. Market specificity: specific market > all countries
  const allCountriesCode = '__ALL_COUNTRIES__'; 
  const aIsGlobal = a.country_code === allCountriesCode;
  const bIsGlobal = b.country_code === allCountriesCode;
  if (aIsGlobal !== bIsGlobal) {
    return aIsGlobal ? 1 : -1;
  }

  return 0;
}

async function styleBrandClaimsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterClaimBrandId, productId, countryCode } = body;

    if (!masterClaimBrandId || typeof masterClaimBrandId !== 'string') {
      return NextResponse.json({ success: false, error: 'Master Claim Brand ID must be a string.' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();

    // 1. Fetch all claims
    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, countryCode);

    if (allClaims.length === 0) {
      const { data: brandData } = await supabase.from('master_claim_brands').select('name').eq('id', masterClaimBrandId).single();
      return NextResponse.json({
        success: true,
        brandName: brandData?.name || 'Unknown Brand',
        styledClaims: [],
        message: 'No claims found for the selected criteria.'
      });
    }

    // 2. Sort claims to establish precedence
    const sortedClaims = allClaims.sort(sortClaims);

    // 3. Use all claims without deduplication to preserve exact database values
    // Note: Keeping all claims as requested in issue #107
    const allClaimsToDisplay = sortedClaims;

    // Prepare for AI
    const claimsForAI = allClaimsToDisplay.map(claim => ({
      text: claim.claim_text,
      type: claim.claim_type,
      level: claim.level,
      market: claim.country_code
    }));

    const systemPrompt = `You are an expert marketing copywriter. Your task is to take a JSON object of product claims and transform it into a structured JSON output.

The final output must be a single JSON object with the following structure:
{
  "introductory_sentence": "A brief sentence identifying the brand, and product/market if specified.",
  "mandatory_claims": [
    { "text": "Rewritten mandatory claim.", "level": "Product" }
    // An array of objects, each containing the rewritten claim text and its original level.
  ],
  "grouped_claims": [
    {
      "level": "Product",
      "allowed_claims": [ /* array of strings */ ],
      "disallowed_claims": [ /* array of strings */ ]
    },
    {
      "level": "Ingredient",
      "allowed_claims": [ /* array of strings */ ],
      "disallowed_claims": [ /* array of strings */ ]
    },
    {
      "level": "Brand",
      "allowed_claims": [ /* array of strings */ ],
      "disallowed_claims": [ /* array of strings */ ]
    }
  ]
}

Instructions:
1.  **Preserve Exact Claim Text**: DO NOT modify or rewrite any claim text. Use the exact "text" value from each input claim without any changes.
2.  **Populate the Structure**:
    - Create a concise introductory sentence.
    - For 'mandatory' claims, place them in the \`mandatory_claims\` array as objects, including the exact \`text\` (unmodified) and the original \`level\`.
    - For all other claims, place them in the correct \`allowed_claims\` or \`disallowed_claims\` array within the object that matches their \`level\`, using the exact claim text.
    - Ensure every level group ('Product', 'Ingredient', 'Brand') is present in the \`grouped_claims\` array, even if its claim arrays are empty.
3.  **Return ONLY JSON**: The final output must be only the JSON object. Do not include any other text, formatting, or explanations.`;
    
    const userPrompt = `
Master Claim Brand ID: "${masterClaimBrandId}"
${productId ? `Product ID: "${productId}"\n` : ''}${countryCode ? `Country Code: "${countryCode}"\n` : ''}
Claims to style:
---
${JSON.stringify(claimsForAI, null, 2)}
---
`;

    const aiData = await generateTextCompletion(systemPrompt, userPrompt, 2000, 0.5);

    if (!aiData || typeof aiData !== 'string') {
      throw new Error('AI processing failed to return valid data.');
    }

    let parsedAIResponse;
    try {
      const cleanedAiData = aiData.replace(/^```json\n|```json|```$/g, '').trim();
      parsedAIResponse = JSON.parse(cleanedAiData);
    } catch (e: unknown) {
      throw new Error(`Failed to parse AI response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    const { data: brandData } = await supabase
      .from('master_claim_brands')
      .select('name')
      .eq('id', masterClaimBrandId)
      .single();

    return NextResponse.json({
      success: true,
      brandName: brandData?.name || 'Unknown Brand',
      styledClaims: parsedAIResponse,
      rawClaimsForAI: claimsForAI
    });

  } catch (error: unknown) {
    console.error('Error in /api/ai/style-brand-claims handler:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }, { status: 500 });
  }
}

export const POST = withAuth(styleBrandClaimsHandler); 