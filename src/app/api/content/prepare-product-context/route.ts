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

/**
 * Fetches all claims at brand, product, and ingredient levels
 * 
 * @param supabase - Initialized Supabase admin client
 * @param masterClaimBrandId - The master claim brand ID to fetch brand-level claims
 * @param productId - The product ID to fetch product and ingredient claims (nullable)
 * @param countryCode - Country code to filter claims, or null for all countries
 * @returns Promise<Claim[]> Array of claims with text, type, level, and country
 * 
 * @description
 * Fetches claims from three levels:
 * 1. Brand-level claims using masterClaimBrandId
 * 2. Product-level claims if productId is provided
 * 3. Ingredient-level claims through product_ingredients junction
 * 
 * Applies country filtering when countryCode is provided, otherwise
 * returns both country-specific and global (ALL) claims.
 */
async function fetchAllBrandClaims(supabase: ReturnType<typeof createSupabaseAdminClient>, masterClaimBrandId: string, productId: string | null, countryCode: string | null): Promise<Claim[]> {
  // Fetch brand-level claims
  let brandQuery = supabase
    .from('claims')
    .select('claim_text, claim_type, level, country_code')
    .eq('master_brand_id', masterClaimBrandId)
    .eq('level', 'brand');

  // Fetch product-level claims if productId is provided
  let productQuery = productId 
    ? supabase
        .from('claims')
        .select('claim_text, claim_type, level, country_code')
        .eq('product_id', productId)
        .eq('level', 'product')
    : null;

  // Fetch ingredient-level claims if productId is provided
  let ingredientClaims: Claim[] = [];
  if (productId) {
    // First get the ingredient IDs for this product
    const { data: ingredients, error: ingredientError } = await supabase
      .from('product_ingredients')
      .select('ingredient_id')
      .eq('product_id', productId);
    
    if (!ingredientError && ingredients && ingredients.length > 0) {
      const ingredientIds = ingredients.map(i => i.ingredient_id);
      const { data: ingredientClaimsData, error: claimsError } = await supabase
        .from('claims')
        .select('claim_text, claim_type, level, country_code')
        .eq('level', 'ingredient')
        .in('ingredient_id', ingredientIds);
      
      if (!claimsError && ingredientClaimsData) {
        ingredientClaims = ingredientClaimsData as Claim[];
      }
    }
  }

  // Add country filter if provided
  if (countryCode) {
    brandQuery = brandQuery.or(`country_code.eq.${countryCode},country_code.eq.__GLOBAL__`);
    if (productQuery) productQuery = productQuery.or(`country_code.eq.${countryCode},country_code.eq.__GLOBAL__`);
    // Filter ingredient claims by country
    ingredientClaims = ingredientClaims.filter(claim => 
      claim.country_code === countryCode || claim.country_code === '__GLOBAL__'
    );
  }

  // Execute queries
  const allClaims: Claim[] = [];
  
  // Add brand claims
  const { data: brandClaims, error: brandError } = await brandQuery;
  if (brandError) {
    console.error('Error fetching brand claims:', brandError);
    throw new Error('Failed to fetch claims for the brand.');
  }
  if (brandClaims) {
    allClaims.push(...(brandClaims as Claim[]));
  }
  
  // Add product claims
  if (productQuery) {
    const { data: productClaims, error: productError } = await productQuery;
    if (productError) {
      console.error('Error fetching product claims:', productError);
      throw new Error('Failed to fetch claims for the product.');
    }
    if (productClaims) {
      allClaims.push(...(productClaims as Claim[]));
    }
  }
  
  // Add ingredient claims
  allClaims.push(...ingredientClaims);

  return allClaims;
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

/**
 * Prepares product context by fetching and styling claims for content generation
 * 
 * @param request - Next.js request object containing productId in JSON body
 * @returns Promise<NextResponse> containing styled claims and product information
 * 
 * @description
 * This handler performs the following operations:
 * 1. Fetches all relevant claims for a product (brand, product, and ingredient levels)
 * 2. Sorts claims by priority (mandatory > allowed > disallowed) and level (brand > product > ingredient)
 * 3. For global (ALL countries) claims, removes duplicates
 * 4. Fetches the product's master brand information
 * 5. Uses AI to style the claims into marketing-friendly language based on brand identity
 * 
 * The styled claims are formatted for easy insertion into content generation prompts
 * and include both the original claims data and the AI-styled marketing version.
 * 
 * @example
 * POST /api/content/prepare-product-context
 * Body: { "productId": "123e4567-e89b-12d3-a456-426614174000" }
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "productName": "Example Product",
 *     "styledClaims": "✓ Clinically proven effectiveness...",
 *     "claims": [...]
 *   }
 * }
 */
async function prepareProductContextHandler(request: NextRequest) {
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
    } catch (e: unknown) {
      throw new Error(`Failed to parse AI response: ${(e as Error).message}`);
    }

    console.log('[prepare-product-context] Successfully parsed AI response:', JSON.stringify(parsedAIResponse, null, 2));

    return NextResponse.json({
      success: true,
      productName,
      styledClaims: parsedAIResponse,
    });

  } catch (error: unknown) {
    console.error('Error in /api/content/prepare-product-context handler:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export const POST = withAuth(prepareProductContextHandler); 