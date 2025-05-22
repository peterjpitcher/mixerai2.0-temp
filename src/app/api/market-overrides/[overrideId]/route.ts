import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
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

// Fields that can be updated. 
// Master claim, market, and target product are part of the override's identity and should not be changed.
// To change those, delete and create a new override.
interface MarketClaimOverridePutPayload {
    is_blocked?: boolean;
    replacement_claim_id?: string | null; 
}

interface RouteParams {
    overrideId: string;
}

// Helper to validate claim properties
async function getClaimProperties(supabase: any, claimId: string): Promise<{ country_code: string; id: string } | null> {
    // @ts-ignore
    const { data, error } = await supabase
        .from('claims')
        .select('id, country_code')
        .eq('id', claimId)
        .single();
    if (error || !data) {
        console.warn(`[API MarketOverrides/:id] Could not fetch properties for claim ID ${claimId}:`, error);
        return null;
    }
    return data as { country_code: string; id: string };
}

// PUT handler for updating an existing market claim override
export const PUT = withAuth(async (req: NextRequest, user: User, { params }: { params: RouteParams }) => {
    const { overrideId } = params;
    try {
        const body: MarketClaimOverridePutPayload = await req.json();
        const { is_blocked, replacement_claim_id } = body;

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ success: false, error: 'No update fields provided.' }, { status: 400 });
        }
        if (typeof is_blocked === 'undefined' && typeof replacement_claim_id === 'undefined') {
             return NextResponse.json({ success: false, error: 'At least one of is_blocked or replacement_claim_id must be provided for update.' }, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();

        // TODO: Permission check - User needs rights for the target_product_id's brand and the market_country_code associated with this override.
        const isAdmin = user?.user_metadata?.role === 'admin';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'You do not have permission to update market overrides.' }, { status: 403 });
        }

        // Fetch the existing override to get its market_country_code for validation if replacement_claim_id is changing
        // @ts-ignore
        const { data: existingOverride, error: fetchError } = await supabase
            .from('market_claim_overrides')
            .select('id, market_country_code, master_claim_id')
            .eq('id', overrideId)
            .single<MarketClaimOverride>();

        if (fetchError || !existingOverride) {
            return NextResponse.json({ success: false, error: `Market override with ID ${overrideId} not found.` }, { status: 404 });
        }
        
        if (replacement_claim_id === existingOverride.master_claim_id) {
            return NextResponse.json({ success: false, error: 'Replacement claim cannot be the same as the master claim.'}, { status: 400 });
        }

        // If replacement_claim_id is being set or changed, validate it's for the correct market_country_code
        if (typeof replacement_claim_id !== 'undefined' && replacement_claim_id !== null) {
            const replacementClaimProps = await getClaimProperties(supabase, replacement_claim_id);
            if (!replacementClaimProps) {
                return NextResponse.json({ success: false, error: `Replacement claim with ID ${replacement_claim_id} not found.` }, { status: 400 });
            }
            if (replacementClaimProps.country_code !== existingOverride.market_country_code) {
                return NextResponse.json({ success: false, error: `Replacement claim ID ${replacement_claim_id} is for country ${replacementClaimProps.country_code}, not for the market ${existingOverride.market_country_code} of this override.` }, { status: 400 });
            }
        }

        const updatePayload: MarketClaimOverridePutPayload = {};
        if (typeof is_blocked !== 'undefined') updatePayload.is_blocked = is_blocked;
        if (typeof replacement_claim_id !== 'undefined') updatePayload.replacement_claim_id = replacement_claim_id; // This handles null correctly

        // @ts-ignore
        const { data, error } = await supabase
            .from('market_claim_overrides')
            .update(updatePayload)
            .eq('id', overrideId)
            .select()
            .single();

        if (error) {
            console.error(`[API MarketOverrides PUT] Error updating market override ${overrideId}:`, error);
             // Foreign key violation for replacement_claim_id
            if ((error as any).code === '23503') { 
                return NextResponse.json(
                   { success: false, error: 'Invalid replacement_claim_id. Ensure it exists.' },
                   { status: 400 }
               );
            }
            // chk_replacement_claim_is_market (Postgres error code 23514)
            if ((error as any).code === '23514') {
                 return NextResponse.json(
                    { success: false, error: 'Database check constraint violated: Replacement claim does not match market country.' },
                    { status: 400 }
                );
            }
            return handleApiError(error, `Failed to update market claim override ${overrideId}.`);
        }

        return NextResponse.json({ success: true, data: data as MarketClaimOverride });

    } catch (error: any) {
        console.error(`[API MarketOverrides PUT /${overrideId}] Catched error:`, error);
        if (error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, `An unexpected error occurred while updating market override ${overrideId}.`);
    }
});

// DELETE handler for removing a market claim override
export const DELETE = withAuth(async (req: NextRequest, user: User, { params }: { params: RouteParams }) => {
    const { overrideId } = params;
    try {
        const supabase = createSupabaseAdminClient();

        // TODO: Permission check - User needs rights for the target_product_id's brand and the market_country_code associated with this override.
        const isAdmin = user?.user_metadata?.role === 'admin';
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'You do not have permission to delete market overrides.' }, { status: 403 });
        }

        // @ts-ignore
        const { error, count } = await supabase
            .from('market_claim_overrides')
            .delete({ count: 'exact' })
            .eq('id', overrideId);

        if (error) {
            console.error(`[API MarketOverrides DELETE] Error deleting market override ${overrideId}:`, error);
            return handleApiError(error, `Failed to delete market claim override ${overrideId}.`);
        }

        if (count === 0) {
            return NextResponse.json(
                { success: false, error: `Market claim override with ID ${overrideId} not found.` }, 
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: `Market claim override ${overrideId} deleted successfully.` });

    } catch (error: any) {
        console.error(`[API MarketOverrides DELETE /${overrideId}] Catched error:`, error);
        return handleApiError(error, `An unexpected error occurred while deleting market override ${overrideId}.`);
    }
}); 