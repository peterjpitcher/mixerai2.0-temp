import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { ALL_COUNTRIES_CODE } from '@/lib/constants/country-codes';

export const dynamic = "force-dynamic";

interface ConflictCheckPayload {
    masterClaimId: string;
    marketCountryCode: string;
    targetProductId: string;
}

// POST handler for checking conflicts before creating overrides
export const POST = withAuthAndCSRF(async (req: NextRequest): Promise<Response> => {
    try {
        const body: ConflictCheckPayload = await req.json();
        const { masterClaimId, marketCountryCode, targetProductId } = body;

        // Basic validation
        if (!masterClaimId || !marketCountryCode || !targetProductId) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing required fields: masterClaimId, marketCountryCode, targetProductId.' 
            }, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();

        interface ConflictInfo {
            type: string;
            message?: string;
            country?: string;
            countryName?: string;
            isBlocked: boolean;
        }
        
        let conflicts: ConflictInfo[] = [];
        
        if (marketCountryCode !== ALL_COUNTRIES_CODE) {
            // Check if global override exists
            const { data: globalOverride } = await supabase
                .from('market_claim_overrides')
                .select('id, is_blocked')
                .eq('master_claim_id', masterClaimId)
                .eq('target_product_id', targetProductId)
                .eq('market_country_code', ALL_COUNTRIES_CODE)
                .single();
                
            if (globalOverride) {
                conflicts.push({
                    type: 'global_exists',
                    message: 'A global override already exists for this claim',
                    isBlocked: globalOverride.is_blocked
                });
            }
        } else {
            // For global overrides, check country-specific ones
            const { data: countryOverrides } = await supabase
                .from('market_claim_overrides')
                .select('market_country_code, is_blocked')
                .eq('master_claim_id', masterClaimId)
                .eq('target_product_id', targetProductId)
                .neq('market_country_code', ALL_COUNTRIES_CODE);
                
            if (countryOverrides && countryOverrides.length > 0) {
                // Get country names for better display
                const countryCodes = countryOverrides.map(o => o.market_country_code);
                const { data: countries } = await supabase
                    .from('countries')
                    .select('code, name')
                    .in('code', countryCodes);
                
                const countryMap = new Map(countries?.map(c => [c.code, c.name]) || []);
                
                conflicts = countryOverrides.map(o => ({
                    type: 'country_specific_exists',
                    country: o.market_country_code,
                    countryName: countryMap.get(o.market_country_code) || o.market_country_code,
                    isBlocked: o.is_blocked
                }));
            }
        }

        return NextResponse.json({ 
            success: true, 
            conflicts,
            hasConflicts: conflicts.length > 0
        });

    } catch (error: unknown) {
        console.error('[API MarketOverrides Check Conflicts POST] Error:', error);
        return handleApiError(error, 'An unexpected error occurred while checking for conflicts.');
    }
});