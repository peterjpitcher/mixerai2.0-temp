import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// ENUM types mirroring the database
type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
    id: string;
    claim_text: string;
    claim_type: ClaimTypeEnum;
    level: ClaimLevelEnum;
    global_brand_id?: string | null;
    product_id?: string | null;
    ingredient_id?: string | null;
    country_code: string; // Can be '__GLOBAL__' or ISO country code
    description?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

// For POST request, allowing multiple product_ids and country_codes
interface ClaimPostRequestData {
    claim_text: string;
    claim_type: ClaimTypeEnum;
    level: ClaimLevelEnum;
    global_brand_id?: string; // Required if level is 'brand'
    product_ids?: string[];   // Required if level is 'product', can be multiple
    ingredient_id?: string; // Required if level is 'ingredient'
    country_codes: string[]; // Can be multiple, including '__GLOBAL__'
    description?: string;
}

// Define the expected schema for a single claim entry in the database
const dbClaimSchema = z.object({
  claim_text: z.string().min(1),
  claim_type: z.enum(['allowed', 'disallowed', 'mandatory']),
  level: z.enum(['brand', 'product', 'ingredient']),
  global_brand_id: z.string().uuid().optional().nullable(),
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
  global_brand_id: z.string().uuid().optional().nullable(),
  ingredient_id: z.string().uuid().optional().nullable(),
  product_ids: z.array(z.string().uuid()).optional().default([]),
  country_codes: z.array(z.string().min(2)).min(1, "At least one country/market must be selected."),
}).refine(data => {
  if (data.level === 'brand' && !data.global_brand_id) return false;
  if (data.level === 'product' && (!data.product_ids || data.product_ids.length === 0)) return false;
  if (data.level === 'ingredient' && !data.ingredient_id) return false;
  return true;
}, {
  message: "An appropriate entity ID (brand, product(s), or ingredient) must be provided for the selected claim level.",
  path: ['level'],
});

// GET handler for all claims
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        if (isBuildPhase()) {
            console.log('[API Claims GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const { searchParams } = new URL(req.url);
        const countryCodeFilter = searchParams.get('countryCode');
        const excludeGlobalFilter = searchParams.get('excludeGlobal') === 'true';
        const levelFilter = searchParams.get('level'); // e.g., 'product', 'brand', 'ingredient'
        // Could also add filters for global_brand_id, product_id, ingredient_id if needed in future

        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        let query = supabase.from('claims').select('*');

        if (countryCodeFilter) {
            // @ts-ignore
            query = query.eq('country_code', countryCodeFilter);
        }

        if (excludeGlobalFilter) {
            // If countryCodeFilter is also __GLOBAL__, this excludeGlobal would make it return nothing.
            // This logic is fine: if user says exclude global, we exclude global.
            // @ts-ignore
            query = query.not('country_code', 'eq', '__GLOBAL__');
        }

        if (levelFilter && ['brand', 'product', 'ingredient'].includes(levelFilter)) {
            // @ts-ignore
            query = query.eq('level', levelFilter);
        }
        
        // @ts-ignore
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('[API Claims GET] Error fetching claims:', error);
            return handleApiError(error, 'Failed to fetch claims');
        }
        
        const validatedData = Array.isArray(data) ? data.map((item: any) => ({
            id: item.id,
            claim_text: item.claim_text,
            claim_type: item.claim_type,
            level: item.level,
            global_brand_id: item.global_brand_id,
            product_id: item.product_id,
            ingredient_id: item.ingredient_id,
            country_code: item.country_code,
            description: item.description,
            created_by: item.created_by,
            created_at: item.created_at,
            updated_at: item.updated_at
        })) : [];

        return NextResponse.json({ success: true, data: validatedData as Claim[] });

    } catch (error: any) {
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
    } catch (e) {
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
        global_brand_id,
        ingredient_id,
        product_ids,
        country_codes 
    } = parsedBody.data;

    // --- Permission Check Start ---
    let hasPermission = user?.user_metadata?.role === 'admin';

    if (!hasPermission) {
        if (level === 'brand' && global_brand_id) {
            // @ts-ignore
            const { data: gcbData, error: gcbError } = await supabase
                .from('global_claim_brands')
                .select('mixerai_brand_id')
                .eq('id', global_brand_id)
                .single();
            if (gcbError || !gcbData || !gcbData.mixerai_brand_id) {
                console.error(`[API Claims POST] Error fetching GCB or GCB not linked for brand-level claim creation permissions (GCB ID: ${global_brand_id}):`, gcbError);
                // Deny permission if GCB not found or not linked
            } else {
                // @ts-ignore
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', gcbData.mixerai_brand_id)
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
                // @ts-ignore
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('global_brand_id')
                    .eq('id', product_id)
                    .single();
                if (productError || !productData || !productData.global_brand_id) {
                    console.error(`[API Claims POST] Error fetching product/GCB for product-level claim creation (Product ID: ${product_id}):`, productError);
                    allProductsPermitted = false; break;
                }
                // @ts-ignore
                const { data: gcbData, error: gcbError } = await supabase
                    .from('global_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.global_brand_id)
                    .single();
                if (gcbError || !gcbData || !gcbData.mixerai_brand_id) {
                    console.error(`[API Claims POST] Error fetching GCB or GCB not linked for product-level claim (Product ID: ${product_id}, GCB ID: ${productData.global_brand_id}):`, gcbError);
                    allProductsPermitted = false; break;
                }
                // @ts-ignore
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', gcbData.mixerai_brand_id)
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
        if (level === 'brand' && global_brand_id) {
            claimsToInsert.push({
                claim_text,
                claim_type,
                level,
                global_brand_id,
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
                global_brand_id: null,
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
                    global_brand_id: null,
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
        const { data, error } = await supabase.from('claims').insert(validatedClaimsToInsert as any).select();

        if (error) {
            console.error('Supabase error inserting claims:', error);
            if (error.code === '23505') {
                return NextResponse.json({ success: false, error: 'One or more claims already exist with the same text, level, entity, country, and type.', details: error.message }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: 'Failed to save claims to database.', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `${data ? data.length : 0} claim(s) created successfully.`, claims: data });
    } catch (e: any) {
        console.error('Catch block error in POST /api/claims:', e);
        if (e.message === "Internal validation error before database operation.") {
            return NextResponse.json({ success: false, error: 'Internal server error during data validation.' }, { status: 500 });
        }
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.', details: e.message }, { status: 500 });
    }
}); 