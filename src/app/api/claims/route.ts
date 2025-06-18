import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = "force-dynamic";




// Define the expected schema for a single claim entry in the database
const dbClaimSchema = z.object({
  claim_text: z.string().min(1),
  claim_type: z.enum(['allowed', 'disallowed', 'mandatory']),
  level: z.enum(['brand', 'product', 'ingredient']),
  master_brand_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  ingredient_id: z.string().uuid().optional().nullable(),
  country_code: z.string().min(2), // e.g., 'US', 'GB', or '__GLOBAL__'
  description: z.string().optional().nullable(),
  created_by: z.string().uuid().optional().nullable(),
});

// Define the schema for the incoming request body from the form
const requestBodySchema = z.object({
  claim_text: z.string().min(1, "Claim text is required."),
  claim_type: z.enum(['allowed', 'disallowed', 'mandatory'], { message: "Invalid claim type." }),
  level: z.enum(['brand', 'product', 'ingredient'], { message: "Invalid claim level." }),
  description: z.string().optional().nullable(),
  master_brand_id: z.string().uuid().optional().nullable(),
  ingredient_id: z.string().uuid().optional().nullable(),
  product_ids: z.array(z.string().uuid()).optional().default([]),
  country_codes: z.array(z.string().min(2)).min(1, "At least one country/market must be selected."),
  workflow_id: z.string().uuid().optional().nullable(), // Added for workflow support
}).refine(data => {
  if (data.level === 'brand' && !data.master_brand_id) return false;
  if (data.level === 'product' && (!data.product_ids || data.product_ids.length === 0)) return false;
  if (data.level === 'ingredient' && !data.ingredient_id) return false;
  return true;
}, {
  message: "An appropriate entity ID (brand, product(s), or ingredient) must be provided for the selected claim level.",
  path: ['level'],
});

// GET handler for all claims
export const GET = withAuth(async (req: NextRequest) => {
    try {
        if (isBuildPhase()) {
            console.log('[API Claims GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const { searchParams } = new URL(req.url);
        const countryCodeFilter = searchParams.get('countryCode');
        const excludeGlobalFilter = searchParams.get('excludeGlobal') === 'true';
        const levelFilter = searchParams.get('level'); // e.g., 'product', 'brand', 'ingredient'
        const includeMasterBrandName = searchParams.get('includeMasterBrandName') === 'true';
        const includeProductNames = searchParams.get('includeProductNames') === 'true';
        const includeIngredientName = searchParams.get('includeIngredientName') === 'true';
        
        // Pagination parameters
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(100, Math.max(1, limit)); // Cap at 100 items per page
        const offset = (validatedPage - 1) * validatedLimit;

        const supabase = createSupabaseAdminClient();
        
        let selectStatement = '*, workflow_id, workflow_status, current_workflow_step,';
        if (includeMasterBrandName) selectStatement += 'master_claim_brands(name),';
        if (includeProductNames) selectStatement += 'products!claims_product_id_fkey(name),';
        if (includeIngredientName) selectStatement += 'ingredients(name),';
        selectStatement = selectStatement.slice(0, -1); // remove last ','

        let query = supabase.from('claims').select(selectStatement);

        if (countryCodeFilter) {
            query = query.eq('country_code', countryCodeFilter);
        }

        if (excludeGlobalFilter) {
            // If countryCodeFilter is also __GLOBAL__, this excludeGlobal would make it return nothing.
            // This logic is fine: if user says exclude global, we exclude global.
            query = query.not('country_code', 'eq', '__GLOBAL__');
        }

        if (levelFilter && ['brand', 'product', 'ingredient'].includes(levelFilter)) {
            query = query.eq('level', levelFilter as 'brand' | 'product' | 'ingredient');
        }
        
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + validatedLimit - 1);

        if (error) {
            console.error('[API Claims GET] Error fetching claims:', error);
            return handleApiError(error, 'Failed to fetch claims');
        }

        // Process data to flatten joined names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedData = Array.isArray(data) ? data.map((claim: any) => ({
            ...claim,
            master_brand_name: (claim.master_claim_brands && typeof claim.master_claim_brands === 'object' && claim.master_claim_brands !== null && 'name' in claim.master_claim_brands) ? claim.master_claim_brands.name : null,
            product_names: (claim['products!claims_product_id_fkey'] && typeof claim['products!claims_product_id_fkey'] === 'object' && claim['products!claims_product_id_fkey'] !== null && 'name' in claim['products!claims_product_id_fkey']) ? [claim['products!claims_product_id_fkey'].name] : [],
            ingredient_name: (claim.ingredients && typeof claim.ingredients === 'object' && claim.ingredients !== null && 'name' in claim.ingredients) ? claim.ingredients.name : null,
            // Ensure country_codes is an array for client-side consistency.
            // This API returns one record per country_code, so we set it up as an array of one.
            country_codes: [claim.country_code]
        })) : [];
        
        // The frontend component expects product_ids and groups claims by text, etc.
        // The current API sends one record per claim definition.
        // A more advanced implementation could group claims here, but for now we will let the client handle it.
        // The old `validatedData` mapping was redundant as we are now processing the data.

        // Calculate pagination metadata
        const totalPages = count ? Math.ceil(count / validatedLimit) : 0;
        const hasNextPage = validatedPage < totalPages;
        const hasPreviousPage = validatedPage > 1;
        
        return NextResponse.json({ 
            success: true, 
            data: processedData,
            pagination: {
                page: validatedPage,
                limit: validatedLimit,
                total: count || 0,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }
        });

    } catch (error: unknown) {
        console.error('[API Claims GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching claims.');
    }
});

// POST handler for creating new claim(s)
export const POST = withAuth(async (req: NextRequest, user: User) => {
    const supabase = createSupabaseAdminClient();
    
    let rawBody;
    try {
        rawBody = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    
    // Log the raw body received by the API endpoint
    console.log("[API Claims POST] Received raw body:", JSON.stringify(rawBody, null, 2));

    const parsedBody = requestBodySchema.safeParse(rawBody);

    if (!parsedBody.success) {
        // Log the detailed Zod error
        console.error("[API Claims POST] Zod validation failed:", JSON.stringify(parsedBody.error.flatten(), null, 2));
        return NextResponse.json({ success: false, error: 'Invalid request data', details: parsedBody.error.flatten() }, { status: 400 });
    }

    const { 
        claim_text,
        claim_type,
        level,
        description,
        master_brand_id,
        ingredient_id,
        product_ids,
        country_codes,
        workflow_id 
    } = parsedBody.data;

    // --- Permission Check Start ---
    let hasPermission = user?.user_metadata?.role === 'admin';

    if (!hasPermission) {
        if (level === 'brand' && master_brand_id) {
            const { data: mcbData, error: mcbError } = await supabase
                .from('master_claim_brands')
                .select('mixerai_brand_id')
                .eq('id', master_brand_id)
                .single();
            if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                console.error(`[API Claims POST] Error fetching MCB or MCB not linked for brand-level claim creation permissions (MCB ID: ${master_brand_id}):`, mcbError);
                // Deny permission if MCB not found or not linked
            } else {
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', mcbData.mixerai_brand_id)
                    .eq('role', 'admin') // User must be admin of the linked MixerAI brand
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API Claims POST] Error fetching user_brand_permissions for brand-level claim:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        } else if (level === 'product' && product_ids && product_ids.length > 0) {
            // For product-level claims, user must have permission for ALL associated core MixerAI brands.
            let allProductsPermitted = true;
            for (const product_id of product_ids) {
                let currentProductPermitted = false;
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('master_brand_id')
                    .eq('id', product_id)
                    .single();
                if (productError || !productData || !productData.master_brand_id) {
                    console.error(`[API Claims POST] Error fetching product/MCB for product-level claim creation (Product ID: ${product_id}):`, productError);
                    allProductsPermitted = false; break;
                }
                const { data: mcbData, error: mcbError } = await supabase
                    .from('master_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.master_brand_id)
                    .single();
                if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                    console.error(`[API Claims POST] Error fetching MCB or MCB not linked for product-level claim (Product ID: ${product_id}, MCB ID: ${productData.master_brand_id}):`, mcbError);
                    allProductsPermitted = false; break;
                }
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', mcbData.mixerai_brand_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API Claims POST] Error fetching user_brand_permissions for product ${product_id}:`, permissionsError);
                    allProductsPermitted = false; break;
                } else if (permissionsData && permissionsData.length > 0) {
                    currentProductPermitted = true;
                }
                if (!currentProductPermitted) {
                    allProductsPermitted = false; break;
                }
            }
            if (allProductsPermitted) hasPermission = true;

        } else if (level === 'ingredient') {
            // For ingredient-level claims, only global admin can create (already covered by initial hasPermission check).
            // If initial check for global admin failed, hasPermission is false.
        }
    }

    if (!hasPermission) {
        return NextResponse.json({ success: false, error: 'You do not have permission to create this type/level of claim for the specified entities.' }, { status: 403 });
    }
    // --- Permission Check End ---

    const claimsToInsert: Array<Omit<z.infer<typeof dbClaimSchema>, 'created_by'> & { created_by: string }> = [];

    for (const country_code of country_codes) {
        if (level === 'brand' && master_brand_id) {
            claimsToInsert.push({
                claim_text,
                claim_type,
                level,
                master_brand_id,
                country_code,
                description,
                created_by: user.id,
                product_id: null, 
                ingredient_id: null,
            });
        } else if (level === 'ingredient' && ingredient_id) {
            claimsToInsert.push({
                claim_text,
                claim_type,
                level,
                ingredient_id,
                country_code,
                description,
                created_by: user.id,
                product_id: null,
                master_brand_id: null,
            });
        } else if (level === 'product' && product_ids && product_ids.length > 0) {
            for (const product_id of product_ids) {
                claimsToInsert.push({
                    claim_text,
                    claim_type,
                    level,
                    product_id,
                    country_code,
                    description,
                    created_by: user.id,
                    master_brand_id: null,
                    ingredient_id: null,
                });
            }
        } else {
            return NextResponse.json({ success: false, error: 'Mismatch in claim level and provided entity IDs (should be caught by Zod).' }, { status: 400 });
        }
    }

    if (claimsToInsert.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid claims were generated for insertion.' }, { status: 400 });
    }
    
    const validatedClaimsToInsert = claimsToInsert.map(claim => {
        const finalClaimPayload = {
            ...claim,
            description: claim.description === undefined ? null : claim.description,
        };
        const validationResult = dbClaimSchema.safeParse(finalClaimPayload);
        if (!validationResult.success) {
            console.error("Failed to validate a claim object before DB insert:", validationResult.error.flatten());
            throw new Error("Internal validation error before database operation."); 
        }
        return validationResult.data;
    });

    try {
        const { data, error } = await supabase.from('claims').insert(validatedClaimsToInsert).select();

        if (error) {
            console.error('Supabase error inserting claims:', error);
            if (error.code === '23505') {
                return NextResponse.json({ success: false, error: 'One or more claims already exist with the same text, level, entity, country, and type.', details: error.message }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: 'Failed to save claims to database.', details: error.message }, { status: 500 });
        }

        // If workflow_id is provided, assign workflow to each created claim
        if (workflow_id && data && data.length > 0) {
            console.log(`[API Claims POST] Assigning workflow ${workflow_id} to ${data.length} claim(s)`);
            
            for (const claim of data) {
                const { data: workflowResult, error: workflowError } = await supabase.rpc('assign_workflow_to_claim', {
                    p_claim_id: claim.id,
                    p_workflow_id: workflow_id
                });

                if (workflowError) {
                    console.error(`[API Claims POST] Error assigning workflow to claim ${claim.id}:`, workflowError);
                    // Continue with other claims even if one fails
                } else {
                    console.log(`[API Claims POST] Workflow assigned to claim ${claim.id}:`, workflowResult);
                }
            }
        }

        return NextResponse.json({ success: true, message: `${data ? data.length : 0} claim(s) created successfully.`, claims: data });
    } catch (e: unknown) {
        console.error('Catch block error in POST /api/claims:', e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage === "Internal validation error before database operation.") {
            return NextResponse.json({ success: false, error: 'Internal server error during data validation.' }, { status: 500 });
        }
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
    }
}); 