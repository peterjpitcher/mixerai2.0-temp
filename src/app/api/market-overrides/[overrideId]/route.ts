import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

import { User } from '@supabase/supabase-js';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

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
async function getClaimProperties(supabase: ReturnType<typeof createSupabaseAdminClient>, claimId: string): Promise<{ country_code: string; id: string } | null> {

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
export const PUT = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
    const { params } = context as { params: RouteParams };
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

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';
        let existingOverrideForPermissionCheck: Partial<MarketClaimOverride> | null = null;

        if (!hasPermission) {
            // Fetch the existing override to get its target_product_id and created_by for permission checking

            const { data: fetchedOverride, error: fetchPermError } = await supabase
                .from('market_claim_overrides')
                .select('id, market_country_code, master_claim_id, target_product_id, created_by') // Added target_product_id and created_by
                .eq('id', overrideId)
                .single<MarketClaimOverride>();

            if (fetchPermError || !fetchedOverride) {
                // If the override doesn't exist, the main logic later will handle it with a 404.
                // However, if there's an error fetching for permissions, we should stop.
                if (fetchPermError) {
                    console.error(`[API MarketOverrides PUT /${overrideId}] Error fetching override for permissions:`, fetchPermError);
                    return handleApiError(fetchPermError, 'Failed to verify override for permissions.');
                }
                // If !fetchedOverride, let main logic handle 404. For permission, this means we can't check specific brand.
                // However, the subsequent `existingOverride` fetch will fail, effectively blocking non-admins if override not found.
            } else {
                existingOverrideForPermissionCheck = fetchedOverride; // Store for later use if needed

                // Allow if user is the creator of the override
                if (fetchedOverride.created_by === user.id) {
                    hasPermission = true;
                }

                if (!hasPermission && fetchedOverride.target_product_id) { // If not creator, check brand admin permissions

                    const { data: productData, error: productError } = await supabase
                        .from('products')

                        .select('master_brand_id') // Renamed
                        .eq('id', fetchedOverride.target_product_id)
                        .single();

                    if (productError || !productData || !productData.master_brand_id) { // Renamed
                        console.error(`[API MarketOverrides PUT /${overrideId}] Error fetching product/MCB for permissions:`, productError);
                    } else {

                        const { data: mcbData, error: mcbError } = await supabase // Renamed
                            .from('master_claim_brands') // Renamed
                            .select('mixerai_brand_id')

                            .eq('id', productData.master_brand_id) // Renamed
                            .single();
                        
                        if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                            console.error(`[API MarketOverrides PUT /${overrideId}] Error fetching MCB or MCB not linked for permissions (MCB ID: ${productData.master_brand_id}):`, mcbError);
                        } else {

                            const { data: permissionsData, error: permissionsError } = await supabase
                                .from('user_brand_permissions')
                                .select('role')
                                .eq('user_id', user.id)
                                .eq('brand_id', mcbData.mixerai_brand_id)
                                .eq('role', 'admin')
                                .limit(1);
                            if (permissionsError) {
                                console.error(`[API MarketOverrides PUT /${overrideId}] Error fetching user_brand_permissions:`, permissionsError);
                            } else if (permissionsData && permissionsData.length > 0) {
                                hasPermission = true;
                            }
                        }
                    }
                }
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ success: false, error: 'You do not have permission to update this market override.' }, { status: 403 });
        }
        // --- Permission Check End ---

        // Fetch the existing override again OR use existingOverrideForPermissionCheck if it was successfully fetched
        // This is to get its market_country_code for validation if replacement_claim_id is changing
        const existingOverrideToUse = existingOverrideForPermissionCheck && existingOverrideForPermissionCheck.id === overrideId 
            ? existingOverrideForPermissionCheck 

            : (await supabase.from('market_claim_overrides').select('id, market_country_code, master_claim_id').eq('id', overrideId).single<MarketClaimOverride>()).data;

        if (!existingOverrideToUse) {
            return NextResponse.json({ success: false, error: `Market override with ID ${overrideId} not found.` }, { status: 404 });
        }
        

        if (replacement_claim_id === existingOverrideToUse.master_claim_id) {
            return NextResponse.json({ success: false, error: 'Replacement claim cannot be the same as the master claim.'}, { status: 400 });
        }

        // If replacement_claim_id is being set or changed, validate it's for the correct market_country_code
        if (typeof replacement_claim_id !== 'undefined' && replacement_claim_id !== null) {
            const replacementClaimProps = await getClaimProperties(supabase, replacement_claim_id);
            if (!replacementClaimProps) {
                return NextResponse.json({ success: false, error: `Replacement claim with ID ${replacement_claim_id} not found.` }, { status: 400 });
            }

            if (replacementClaimProps.country_code !== existingOverrideToUse.market_country_code) {
                return NextResponse.json({ success: false, error: `Replacement claim ID ${replacement_claim_id} is for country ${replacementClaimProps.country_code}, not for the market ${existingOverrideToUse.market_country_code} of this override.` }, { status: 400 });
            }
        }

        const updatePayload: MarketClaimOverridePutPayload = {};
        if (typeof is_blocked !== 'undefined') updatePayload.is_blocked = is_blocked;
        if (typeof replacement_claim_id !== 'undefined') updatePayload.replacement_claim_id = replacement_claim_id; // This handles null correctly

        const { data, error } = await supabase
            .from('market_claim_overrides')
            .update(updatePayload)
            .eq('id', overrideId)
            .select()
            .single();

        if (error) {
            console.error(`[API MarketOverrides PUT] Error updating market override ${overrideId}:`, error);
             // Foreign key violation for replacement_claim_id
            if ((error as { code?: string }).code === '23503') { 
                return NextResponse.json(
                   { success: false, error: 'Invalid replacement_claim_id. Ensure it exists.' },
                   { status: 400 }
               );
            }
            // chk_replacement_claim_is_market (Postgres error code 23514)
            if ((error as { code?: string }).code === '23514') {
                 return NextResponse.json(
                    { success: false, error: 'Database check constraint violated: Replacement claim does not match market country.' },
                    { status: 400 }
                );
            }
            return handleApiError(error, `Failed to update market claim override ${overrideId}.`);
        }

        return NextResponse.json({ success: true, data: data as MarketClaimOverride });

    } catch (error: unknown) {
        console.error(`[API MarketOverrides PUT /${overrideId}] Catched error:`, error);
        if (error instanceof Error && error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, `An unexpected error occurred while updating market override ${overrideId}.`);
    }
});

// DELETE handler for removing a market claim override
export const DELETE = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
    const { params } = context as { params: RouteParams };
    const { overrideId } = params;
    try {
        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // Fetch the existing override to get its target_product_id and created_by for permission checking

            const { data: fetchedOverride, error: fetchPermError } = await supabase
                .from('market_claim_overrides')
                .select('target_product_id, created_by') // Select fields needed for permission
                .eq('id', overrideId)
                .single<MarketClaimOverride>();

            if (fetchPermError || !fetchedOverride) {
                if (fetchPermError) {
                    console.error(`[API MarketOverrides DELETE /${overrideId}] Error fetching override for permissions:`, fetchPermError);
                    return handleApiError(fetchPermError, 'Failed to verify override for permissions before deletion.');
                }
                // If !fetchedOverride, let the main delete logic handle the 404.
            } else {
                if (fetchedOverride.created_by === user.id) {
                    hasPermission = true;
                }

                if (!hasPermission && fetchedOverride.target_product_id) {

                    const { data: productData, error: productError } = await supabase
                        .from('products')

                        .select('master_brand_id') // Renamed
                        .eq('id', fetchedOverride.target_product_id)
                        .single();

                    if (productError || !productData || !productData.master_brand_id) { // Renamed
                        console.error(`[API MarketOverrides DELETE /${overrideId}] Error fetching product/MCB for permissions:`, productError);
                    } else {

                        const { data: mcbData, error: mcbError } = await supabase // Renamed
                            .from('master_claim_brands') // Renamed
                            .select('mixerai_brand_id')

                            .eq('id', productData.master_brand_id) // Renamed
                            .single();
                        
                        if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                            console.error(`[API MarketOverrides DELETE /${overrideId}] Error fetching MCB or MCB not linked for permissions (MCB ID: ${productData.master_brand_id}):`, mcbError);
                        } else {

                            const { data: permissionsData, error: permissionsError } = await supabase
                                .from('user_brand_permissions')
                                .select('role')
                                .eq('user_id', user.id)
                                .eq('brand_id', mcbData.mixerai_brand_id)
                                .eq('role', 'admin')
                                .limit(1);
                            if (permissionsError) {
                                console.error(`[API MarketOverrides DELETE /${overrideId}] Error fetching user_brand_permissions:`, permissionsError);
                            } else if (permissionsData && permissionsData.length > 0) {
                                hasPermission = true;
                            }
                        }
                    }
                }
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ success: false, error: 'You do not have permission to delete this market override.' }, { status: 403 });
        }
        // --- Permission Check End ---

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

    } catch (error: unknown) {
        console.error(`[API MarketOverrides DELETE /${overrideId}] Catched error:`, error);
        return handleApiError(error, `An unexpected error occurred while deleting market override ${overrideId}.`);
    }
}); 