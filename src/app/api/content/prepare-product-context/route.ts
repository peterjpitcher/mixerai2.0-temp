import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';
import { generateTextCompletion } from '@/lib/azure/openai';
import { withAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

type Claim = {
  claim_text: string;
  claim_type: 'mandatory' | 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  country_code: string;
};

async function fetchAllBrandClaims(supabase: any, masterClaimBrandId: string, productId: string | null, countryCode: string | null): Promise<Claim[]> {
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

function sortClaims(a: Claim, b: Claim): number {
  if (a.claim_type === 'mandatory' && b.claim_type !== 'mandatory') return -1;
  if (a.claim_type !== 'mandatory' && b.claim_type === 'mandatory') return 1;

  const levelOrder = { product: 1, ingredient: 2, brand: 3 };
  const aLevel = levelOrder[a.level];
  const bLevel = levelOrder[b.level];
  if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }

  const allCountriesCode = '__ALL_COUNTRIES__';
  const aIsGlobal = a.country_code === allCountriesCode;
  const bIsGlobal = b.country_code === allCountriesCode;
  if (aIsGlobal !== bIsGlobal) {
    return aIsGlobal ? 1 : -1;
  }

  return 0;
}

async function prepareProductContextHandler(request: NextRequest, user: User) {
  try {
    const { productId } = await request.json();

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ success: false, error: 'Product ID must be provided.' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();

    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('name, master_brand_id')
        .eq('id', productId)
        .single();
    
    if (productError) throw new Error('Could not find the specified product.');
    if (!productData) return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    
    const { name: productName, master_brand_id: masterClaimBrandId } = productData;

    if (!masterClaimBrandId) {
        return NextResponse.json({
            success: true,
            productName,
            styledClaims: null,
            message: 'This product is not associated with a master brand and has no claims.'
        });
    }

    const allClaims = await fetchAllBrandClaims(supabase, masterClaimBrandId, productId, null);

    if (allClaims.length === 0) {
      return NextResponse.json({
        success: true,
        productName,
        styledClaims: null,
        message: 'No claims found for this product.'
      });
    }

    const sortedClaims = allClaims.sort(sortClaims);

    const uniqueClaimsMap = new Map<string, Claim>();
    for (const claim of sortedClaims) {
      if (!uniqueClaimsMap.has(claim.claim_text)) {
        uniqueClaimsMap.set(claim.claim_text, claim);
      }
    }
    const uniqueClaims = Array.from(uniqueClaimsMap.values());

    const claimsForAI = uniqueClaims.map(claim => ({
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
  ],
  "grouped_claims": [
    {
      "level": "Product",
      "allowed_claims": [],
      "disallowed_claims": []
    },
    {
      "level": "Ingredient",
      "allowed_claims": [],
      "disallowed_claims": []
    },
    {
      "level": "Brand",
      "allowed_claims": [],
      "disallowed_claims": []
    }
  ]
}

Instructions:
1.  **Rewrite Each Claim**: Rewrite the "text" of each input claim to be more natural and readable for a marketing professional.
2.  **Populate the Structure**:
    - Create a concise introductory sentence.
    - For 'mandatory' claims, place them in the \`mandatory_claims\` array as objects, including both the rewritten \`text\` and the original \`level\`.
    - For all other claims, place them in the correct \`allowed_claims\` or \`disallowed_claims\` array within the object that matches their \`level\`.
    - Ensure every level group ('Product', 'Ingredient', 'Brand') is present in the \`grouped_claims\` array, even if its claim arrays are empty.
3.  **Return ONLY JSON**: The final output must be only the JSON object. Do not include any other text, formatting, or explanations.`;
    
    const userPrompt = `
Product ID: "${productId}"
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
    } catch (e: any) {
      throw new Error(`Failed to parse AI response: ${e.message}`);
    }

    console.log('[prepare-product-context] Successfully parsed AI response:', JSON.stringify(parsedAIResponse, null, 2));

    return NextResponse.json({
      success: true,
      productName,
      styledClaims: parsedAIResponse,
    });

  } catch (error: any) {
    console.error('Error in /api/content/prepare-product-context handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(prepareProductContextHandler); 