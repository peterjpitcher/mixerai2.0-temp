import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

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
    try {
        const body: ClaimPostRequestData = await req.json();
        const { 
            claim_text, claim_type, level, 
            global_brand_id, product_ids, ingredient_id, 
            country_codes, description 
        } = body;

        // Basic validation
        if (!claim_text || !claim_type || !level || !country_codes || country_codes.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields: claim_text, claim_type, level, and at least one country_code.' }, { status: 400 });
        }
        if (!['allowed', 'disallowed', 'mandatory'].includes(claim_type)) {
            return NextResponse.json({ success: false, error: 'Invalid claim_type.' }, { status: 400 });
        }
        if (!['brand', 'product', 'ingredient'].includes(level)) {
            return NextResponse.json({ success: false, error: 'Invalid claim level.' }, { status: 400 });
        }

        let targetEntityIds: Array<{ product_id?: string; global_brand_id?: string; ingredient_id?: string }> = [];

        if (level === 'brand') {
            if (!global_brand_id) return NextResponse.json({ success: false, error: 'global_brand_id is required for brand-level claims.' }, { status: 400 });
            targetEntityIds.push({ global_brand_id });
        } else if (level === 'product') {
            if (!product_ids || product_ids.length === 0) return NextResponse.json({ success: false, error: 'At least one product_id is required for product-level claims.' }, { status: 400 });
            product_ids.forEach(pid => targetEntityIds.push({ product_id: pid }));
        } else if (level === 'ingredient') {
            if (!ingredient_id) return NextResponse.json({ success: false, error: 'ingredient_id is required for ingredient-level claims.' }, { status: 400 });
            targetEntityIds.push({ ingredient_id });
        }

        if (targetEntityIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No target entities specified for the claim.' }, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();
        // TODO: Permission checks: user needs rights to create claims for the specified brand/product/ingredient.
        const isAdmin = user?.user_metadata?.role === 'admin';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'You do not have permission to create claims.' }, { status: 403 });
        }

        const claimsToInsert: Array<Omit<Claim, 'id' | 'created_at' | 'updated_at'> & { created_by?: string }> = [];
        for (const entity of targetEntityIds) {
            for (const country_code of country_codes) {
                claimsToInsert.push({
                    claim_text: claim_text.trim(),
                    claim_type,
                    level,
                    global_brand_id: entity.global_brand_id || null,
                    product_id: entity.product_id || null,
                    ingredient_id: entity.ingredient_id || null,
                    country_code,
                    description: description?.trim() || null,
                    created_by: user.id
                });
            }
        }

        if (claimsToInsert.length === 0) {
             return NextResponse.json({ success: false, error: 'No valid claims generated to insert.' }, { status: 400 });
        }

        // @ts-ignore
        const { data, error } = await supabase.from('claims').insert(claimsToInsert).select();

        if (error) {
            console.error('[API Claims POST] Error creating claims:', error);
            if ((error as any).code === '23505') { // Unique constraint violation
                 return NextResponse.json(
                    { success: false, error: 'One or more claims with this combination of text, level, entity, country, and type already exist.' },
                    { status: 409 }
                );
            }
            if ((error as any).code === '23503') { // Foreign key violation
                return NextResponse.json(
                   { success: false, error: 'Invalid entity ID (brand, product, or ingredient) or user ID.' },
                   { status: 400 }
               );
           }
            // CHK_CLAIM_LEVEL_REFERENCE (constraint name from schema for checking correct FK based on level)
            // PostgreSQL error code for check constraint violation is '23514'
            if ((error as any).code === '23514') { 
                return NextResponse.json(
                    { success: false, error: 'Claim level and associated entity ID do not match. E.g., a brand-level claim must have a global_brand_id.' },
                    { status: 400 }
                );
            }
            return handleApiError(error, 'Failed to create claims.');
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


        return NextResponse.json({ success: true, data: validatedData as Claim[] }, { status: 201 });

    } catch (error: any) {
        console.error('[API Claims POST] Catched error:', error);
        if (error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating claims.');
    }
}); 