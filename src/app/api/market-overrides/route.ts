import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface MarketClaimOverride {
    id: string;
    master_claim_id: string;
    market_country_code: string;
    target_product_id: string;
    is_blocked: boolean;
    replacement_claim_id: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface MarketClaimOverridePostPayload {
    master_claim_id: string;
    market_country_code: string;
    target_product_id: string;
    is_blocked?: boolean; // Defaults to true in DB if not provided, API could enforce it or let DB handle
    replacement_claim_id?: string | null;
}

// Helper to validate claim properties via a Supabase call
async function getClaimProperties(supabase: any, claimId: string): Promise<{ country_code: string; id: string } | null> {
    // @ts-ignore
    const { data, error } = await supabase
        .from('claims')
        .select('id, country_code')
        .eq('id', claimId)
        .single();
    if (error || !data) {
        console.warn(`[API MarketOverrides] Could not fetch properties for claim ID ${claimId}:`, error);
        return null;
    }
    return data as { country_code: string; id: string };
}


// POST handler for creating a new market claim override
export const POST = withAuth(async (req: NextRequest, _user: User) => {
    try {
        const body: MarketClaimOverridePostPayload = await req.json();
        const { 
            master_claim_id, 
            market_country_code, 
            target_product_id, 
            is_blocked = true, // Default to true if not provided by client
            replacement_claim_id 
        } = body;

        // Basic validation
        if (!master_claim_id || !market_country_code || !target_product_id) {
            return NextResponse.json({ success: false, error: 'Missing required fields: master_claim_id, market_country_code, target_product_id.' }, { status: 400 });
        }
        if (market_country_code === '__GLOBAL__') {
            return NextResponse.json({ success: false, error: 'market_country_code cannot be __GLOBAL__ for an override.' }, { status: 400 });
        }
        if (replacement_claim_id === master_claim_id) {
            return NextResponse.json({ success: false, error: 'Replacement claim cannot be the same as the master claim.'}, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission && target_product_id) {
            // @ts-ignore
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('master_brand_id')
                .eq('id', target_product_id)
                .single();

            if (productError || !productData || !productData.master_brand_id) {
                console.error(`[API MarketOverrides POST] Error fetching product/MCB for permissions (Product ID: ${target_product_id}):`, productError);
                // Deny permission if product or its MCB link is not found
            } else {
                // @ts-ignore
                const { data: mcbData, error: mcbError } = await supabase
                    .from('master_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.master_brand_id)
                    .single();
                
                if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                    console.error(`[API MarketOverrides POST] Error fetching MCB or MCB not linked for permissions (MCB ID: ${productData.master_brand_id}):`, mcbError);
                    // Deny permission if MCB not found or not linked to a core MixerAI brand
                } else {
                    // @ts-ignore
                    const { data: permissionsData, error: permissionsError } = await supabase
                        .from('user_brand_permissions')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('brand_id', mcbData.mixerai_brand_id)
                        .eq('role', 'admin') // Must be an admin of the core MixerAI brand
                        .limit(1);

                    if (permissionsError) {
                        console.error(`[API MarketOverrides POST] Error fetching user_brand_permissions:`, permissionsError);
                    } else if (permissionsData && permissionsData.length > 0) {
                        hasPermission = true;
                    }
                }
            }
        } else if (!target_product_id && !hasPermission) {
            // If target_product_id is missing and user is not admin, deny (though already caught by basic validation)
            // This case is mostly for completeness, as the initial check `!master_claim_id || ...` should catch missing target_product_id.
        }

        if (!hasPermission) {
            return NextResponse.json({ success: false, error: 'You do not have permission to create market overrides for this product.' }, { status: 403 });
        }
        // --- Permission Check End ---

        // Validate master_claim_id is indeed a __GLOBAL__ claim
        const masterClaimProps = await getClaimProperties(supabase, master_claim_id);
        if (!masterClaimProps) {
            return NextResponse.json({ success: false, error: `Master claim with ID ${master_claim_id} not found.` }, { status: 400 });
        }
        if (masterClaimProps.country_code !== '__GLOBAL__') {
            return NextResponse.json({ success: false, error: `Master claim ID ${master_claim_id} is not a global (__GLOBAL__) claim.` }, { status: 400 });
        }

        // If replacement_claim_id is provided, validate it's for the correct market_country_code
        if (replacement_claim_id) {
            const replacementClaimProps = await getClaimProperties(supabase, replacement_claim_id);
            if (!replacementClaimProps) {
                return NextResponse.json({ success: false, error: `Replacement claim with ID ${replacement_claim_id} not found.` }, { status: 400 });
            }
            if (replacementClaimProps.country_code !== market_country_code) {
                return NextResponse.json({ success: false, error: `Replacement claim ID ${replacement_claim_id} is for country ${replacementClaimProps.country_code}, not for the market ${market_country_code}.` }, { status: 400 });
            }
        }
        
        const newRecord: Omit<MarketClaimOverride, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { created_by: string } = {
            master_claim_id,
            market_country_code,
            target_product_id,
            is_blocked,
            replacement_claim_id: replacement_claim_id || null,
            created_by: user.id,
        };

        // @ts-ignore
        const { data, error } = await supabase.from('market_claim_overrides').insert(newRecord).select().single();

        if (error) {
            console.error('[API MarketOverrides POST] Error creating market override:', error);
            // Foreign key violation for master_claim_id or target_product_id or replacement_claim_id
            if ((error as any).code === '23503') { 
                return NextResponse.json(
                   { success: false, error: 'Invalid master_claim_id, target_product_id, or replacement_claim_id. Ensure they exist.' },
                   { status: 400 }
               );
            }
            // Unique constraint chk_master_claim_is_global, chk_replacement_claim_is_market (Postgres error code for check constraint is 23514)
            // These should be caught by application logic above, but as a fallback:
            if ((error as any).code === '23514') {
                 return NextResponse.json(
                    { success: false, error: 'Database check constraint violated. This might be due to master claim not being global or replacement claim not matching market.' },
                    { status: 400 }
                );
            }
             // Unique constraint violation for (master_claim_id, market_country_code, target_product_id)
            if ((error as any).code === '23505') {
                 return NextResponse.json(
                    { success: false, error: 'An override for this master claim, market, and product already exists.' },
                    { status: 409 } // Conflict
                );
            }
            return handleApiError(error, 'Failed to create market claim override.');
        }

        return NextResponse.json({ success: true, data: data as MarketClaimOverride }, { status: 201 });

    } catch (error: any) {
        console.error('[API MarketOverrides POST] Catched error:', error);
        if (error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the market claim override.');
    }
});

// GET handler for market claim overrides (optional - could be filtered)
export const GET = withAuth(async (req: NextRequest, _user: User) => {
    try {
        if (isBuildPhase()) {
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }
        const { searchParams } = new URL(req.url);
        const target_product_id = searchParams.get('target_product_id');
        const market_country_code = searchParams.get('market_country_code');

        const supabase = createSupabaseAdminClient();
        
        // Updated query to join with claims table for master and replacement claim details
        const selectQuery = `
            id, 
            master_claim_id, 
            market_country_code, 
            target_product_id, 
            is_blocked, 
            replacement_claim_id,
            created_by,
            created_at,
            updated_at,
            master_claim:claims!inner!master_claim_id(claim_text, claim_type),
            replacement_claim:claims!left!replacement_claim_id(claim_text, claim_type)
        `;

        // @ts-ignore supabase client query typing
        let query = supabase.from('market_claim_overrides').select(selectQuery);

        if (target_product_id) {
            // @ts-ignore
            query = query.eq('target_product_id', target_product_id);
        }
        if (market_country_code) {
            // @ts-ignore
            query = query.eq('market_country_code', market_country_code);
        }
        
        // @ts-ignore
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('[API MarketOverrides GET] Error fetching market overrides:', error);
            return handleApiError(error, 'Failed to fetch market overrides');
        }

        // Transform data to include flattened claim texts and types
        const enrichedData = data.map((override: any) => ({
            ...override,
            master_claim_text: override.master_claim?.claim_text,
            master_claim_type: override.master_claim?.claim_type,
            replacement_claim_text: override.replacement_claim?.claim_text,
            replacement_claim_type: override.replacement_claim?.claim_type,
            // Remove nested objects if they are not needed by client directly
            master_claim: undefined,
            replacement_claim: undefined,
        }));

        return NextResponse.json({ success: true, data: enrichedData });

    } catch (error: any) {
        console.error('[API MarketOverrides GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching market overrides.');
    }
}); 