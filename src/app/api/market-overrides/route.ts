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
export const POST = withAuth(async (req: NextRequest, user: User) => {
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

        // TODO: Permission check - User needs rights for the target_product_id's brand and the market_country_code.
        const isAdmin = user?.user_metadata?.role === 'admin';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'You do not have permission to create market overrides.' }, { status: 403 });
        }

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
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        if (isBuildPhase()) {
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');
        const marketCode = searchParams.get('marketCode');
        const replacementClaimId = searchParams.get('replacementClaimId');

        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        let query = supabase.from('market_claim_overrides').select('*');

        if (productId) {
            // @ts-ignore
            query = query.eq('target_product_id', productId);
        }
        if (marketCode) {
            // @ts-ignore
            query = query.eq('market_country_code', marketCode);
        }
        if (replacementClaimId) {
            // @ts-ignore
            query = query.eq('replacement_claim_id', replacementClaimId);
        }
        
        // @ts-ignore
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('[API MarketOverrides GET] Error fetching market overrides:', error);
            return handleApiError(error, 'Failed to fetch market overrides');
        }

        return NextResponse.json({ success: true, data: data as MarketClaimOverride[] });

    } catch (error: any) {
        console.error('[API MarketOverrides GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching market overrides.');
    }
}); 