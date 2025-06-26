import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkProductClaimsPermission } from '@/lib/api/claims-helpers';

export const dynamic = "force-dynamic";

// Define types for the joined data from Supabase
interface ClaimWithRelations {
  id: string;
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'brand' | 'product' | 'ingredient';
  master_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string | null;
  workflow_status?: string | null;
  current_workflow_step?: number | null;
  master_claim_brands?: { name: string } | null;
  'products!claims_product_id_fkey'?: { name: string } | null;
  ingredients?: { name: string } | null;
}


// Define the schema for the incoming request body from the form
const requestBodySchema = z.object({
  claim_text: z.string().min(1, "Claim text is required."),
  claim_type: z.enum(['allowed', 'disallowed'], { message: "Invalid claim type." }),
  level: z.enum(['brand', 'product', 'ingredient'], { message: "Invalid claim level." }),
  description: z.string().optional().nullable(),
  master_brand_id: z.string().uuid().optional().nullable(),
  ingredient_id: z.string().uuid().optional().nullable(), // Deprecated, for backward compatibility
  ingredient_ids: z.array(z.string().uuid()).optional().default([]), // New field for multiple ingredients
  product_ids: z.array(z.string().uuid()).optional().default([]),
  country_codes: z.array(z.string().min(2)).min(1, "At least one country/market must be selected."),
  workflow_id: z.string().uuid().optional().nullable(), // Added for workflow support
}).refine(data => {
  if (data.level === 'brand' && !data.master_brand_id) return false;
  if (data.level === 'product' && (!data.product_ids || data.product_ids.length === 0)) return false;
  if (data.level === 'ingredient' && !data.ingredient_id && (!data.ingredient_ids || data.ingredient_ids.length === 0)) return false;
  return true;
}, {
  message: "An appropriate entity ID (brand, product(s), or ingredient(s)) must be provided for the selected claim level.",
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
        
        // Build select statement with proper joins
        let selectStatement = '*, workflow_id, workflow_status, current_workflow_step';
        
        // Add joins for related entities
        if (includeMasterBrandName) {
            selectStatement += ', master_claim_brands!claims_master_brand_id_fkey(name)';
        }
        
        if (includeIngredientName) {
            selectStatement += ', ingredients!claims_ingredient_id_fkey(name)';
        }
        
        // Note: Product names will be fetched separately due to junction table

        let query = supabase.from('claims').select(selectStatement, { count: 'exact' });

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
        // Type assertion after error check - data is definitely not an error at this point
        const claims = data as unknown as ClaimWithRelations[] | null;
        
        // If we need product names and have claims, fetch them from junction table
        const productNamesByClaimId: Record<string, string[]> = {};
        if (includeProductNames && claims && claims.length > 0) {
            const claimIds = claims.map(c => c.id);
            
            // Fetch product associations from junction table
            const { data: productAssociations, error: productError } = await supabase
                .from('claim_products')
                .select('claim_id, products(id, name)')
                .in('claim_id', claimIds);
            
            if (!productError && productAssociations) {
                // Group product names by claim ID
                productAssociations.forEach((assoc: any) => {
                    if (!productNamesByClaimId[assoc.claim_id]) {
                        productNamesByClaimId[assoc.claim_id] = [];
                    }
                    if (assoc.products && typeof assoc.products === 'object' && 'name' in assoc.products) {
                        productNamesByClaimId[assoc.claim_id].push(assoc.products.name);
                    }
                });
            }
        }
        
        const processedData = claims && Array.isArray(claims) ? 
            claims.map((claimData) => ({
                ...claimData,
                master_brand_name: claimData['master_claim_brands!claims_master_brand_id_fkey']?.name || claimData.master_claim_brands?.name || null,
                // Get product names from junction table or fall back to deprecated product_id
                product_names: productNamesByClaimId[claimData.id] || 
                    (claimData['products!claims_product_id_fkey']?.name ? [claimData['products!claims_product_id_fkey'].name] : []),
                ingredient_name: claimData['ingredients!claims_ingredient_id_fkey']?.name || claimData.ingredients?.name || null,
                // Ensure country_codes is an array for client-side consistency.
                // This API returns one record per country_code, so we set it up as an array of one.
                country_codes: [claimData.country_code]
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
export const POST = withAuthAndCSRF(async (req: NextRequest, user: User) => {
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
        ingredient_ids,
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
            // Use optimized batch query to check permissions
            const permissionCheck = await checkProductClaimsPermission(user.id, product_ids);
            if (permissionCheck.hasPermission) {
                hasPermission = true;
            } else {
                console.error('[API Claims POST] Permission check failed:', permissionCheck.errors.join(', '));
            }
        } else if (level === 'ingredient') {
            // For ingredient-level claims, only global admin can create (already covered by initial hasPermission check).
            // If initial check for global admin failed, hasPermission is false.
        }
    }

    if (!hasPermission) {
        return NextResponse.json({ success: false, error: 'You do not have permission to create this type/level of claim for the specified entities.' }, { status: 403 });
    }
    // --- Permission Check End ---

    try {
        // Handle backward compatibility - if ingredient_ids is provided, use it; otherwise fall back to ingredient_id
        let finalIngredientIds = ingredient_ids;
        if (level === 'ingredient' && (!ingredient_ids || ingredient_ids.length === 0) && ingredient_id) {
            finalIngredientIds = [ingredient_id];
        }

        // Use the create_claim_with_associations function to create claim with junction tables
        const { data: claimId, error } = await supabase.rpc('create_claim_with_associations', {
            p_claim_text: claim_text,
            p_claim_type: claim_type,
            p_level: level,
            p_master_brand_id: level === 'brand' && master_brand_id ? master_brand_id : undefined,
            p_ingredient_id: undefined, // Deprecated parameter, passing undefined
            p_ingredient_ids: level === 'ingredient' ? finalIngredientIds : [],
            p_product_ids: level === 'product' ? product_ids : [],
            p_country_codes: country_codes,
            p_description: description || undefined,
            p_created_by: user.id,
            p_workflow_id: workflow_id || undefined
        });

        if (error) {
            console.error('Supabase error creating claim:', error);
            if (error.code === '23505') {
                return NextResponse.json({ success: false, error: 'A claim already exists with the same text, level, and entity.', details: error.message }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: 'Failed to create claim.', details: error.message }, { status: 500 });
        }

        if (!claimId) {
            return NextResponse.json({ success: false, error: 'Failed to create claim - no ID returned.' }, { status: 500 });
        }

        // Fetch the created claim with all its details
        const { data: createdClaim, error: fetchError } = await supabase
            .from('claims')
            .select('*')
            .eq('id', claimId)
            .single();

        if (fetchError) {
            console.error('[API Claims POST] Error fetching created claim:', fetchError);
            // Claim was created but we couldn't fetch it - still return success
            return NextResponse.json({ 
                success: true, 
                message: 'Claim created successfully.',
                claimId: claimId 
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Claim created successfully with associations to multiple countries/entities.', 
            claim: createdClaim,
            claimId: claimId
        });
    } catch (e: unknown) {
        console.error('Catch block error in POST /api/claims:', e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
    }
}); 