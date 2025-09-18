import { NextResponse, NextRequest } from 'next/server';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { ALL_COUNTRIES_CODE } from '@/lib/constants/country-codes';
import { withCorrelation } from '@/lib/observability/with-correlation';
import { timed } from '@/lib/observability/timer';
import { invalidateClaimsCacheForProduct } from '@/lib/claims-service';
import { ok, fail } from '@/lib/http/response';
import { logClaimAudit } from '@/lib/audit';
import { logSecurityEvent } from '@/lib/auth/account-lockout';

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
    forceGlobal?: boolean; // For overriding existing country-specific overrides
}


// Helper to validate claim properties via a Supabase call
async function getClaimProperties(supabase: ReturnType<typeof createSupabaseAdminClient>, claimId: string): Promise<{ country_code: string; id: string } | null> {

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

// Helper function to check for conflicts
async function checkForConflicts(supabase: ReturnType<typeof createSupabaseAdminClient>, data: { masterClaimId: string; targetProductId: string; marketCountryCode: string }) {
    if (data.marketCountryCode !== ALL_COUNTRIES_CODE) {
        // Check if global override exists
        const { data: globalOverride } = await supabase
            .from('market_claim_overrides')
            .select('id')
            .eq('master_claim_id', data.masterClaimId)
            .eq('target_product_id', data.targetProductId)
            .eq('market_country_code', ALL_COUNTRIES_CODE)
            .single();
            
        return {
            hasConflicts: !!globalOverride,
            details: globalOverride ? [{
                type: 'global_exists',
                message: 'A global override already exists for this claim'
            }] : []
        };
    }
    
    // For global overrides, check country-specific ones
    const { data: countryOverrides } = await supabase
        .from('market_claim_overrides')
        .select('market_country_code, is_blocked')
        .eq('master_claim_id', data.masterClaimId)
        .eq('target_product_id', data.targetProductId)
        .neq('market_country_code', ALL_COUNTRIES_CODE);
        
    return {
        hasConflicts: (countryOverrides?.length || 0) > 0,
        details: countryOverrides?.map((o) => ({
            type: 'country_specific_exists',
            country: o.market_country_code,
            isBlocked: o.is_blocked
        }))
    };
}

// Helper to audit global operations
async function auditGlobalOperation(supabase: ReturnType<typeof createSupabaseAdminClient>, data: {
    overrideId: string;
    action: string;
    userId: string;
    affectedCountries: string[];
    newState: unknown;
    previousState?: unknown;
}) {
    // TODO: Re-enable after global_override_audit table is added to TypeScript types
    // const { error } = await supabase
    //     .from('global_override_audit')
    //     .insert({
    //         override_id: data.overrideId,
    //         action: data.action,
    //         user_id: data.userId,
    //         affected_countries: data.affectedCountries,
    //         new_state: data.newState,
    //         previous_state: data.previousState
    //     });
    //     
    // if (error) {
    //     console.error('[API MarketOverrides] Error auditing global operation:', error);
    // }
    
    // Log to console for now
    console.log('[API MarketOverrides] Audit log (table not yet in types):', {
        override_id: data.overrideId,
        action: data.action,
        user_id: data.userId,
        affected_countries: data.affectedCountries
    });
}


// POST handler for creating a new market claim override
export const POST = withCorrelation(withAuthAndCSRF(async (req: NextRequest, user: User): Promise<Response> => {
    try {
        const body: MarketClaimOverridePostPayload = await req.json();
        const { 
            master_claim_id, 
            market_country_code, 
            target_product_id, 
            is_blocked = true, // Default to true if not provided by client
            replacement_claim_id,
            forceGlobal
        } = body;

        // Basic validation
        if (!master_claim_id || !market_country_code || !target_product_id) {
            return NextResponse.json({ success: false, error: 'Missing required fields: master_claim_id, market_country_code, target_product_id.' }, { status: 400 });
        }
        
        // Allow __ALL_COUNTRIES__ but not __GLOBAL__
        if (market_country_code === GLOBAL_CLAIM_COUNTRY_CODE) {
            return NextResponse.json({ success: false, error: 'market_country_code cannot be __GLOBAL__ for an override.' }, { status: 400 });
        }
        
        if (replacement_claim_id === master_claim_id) {
            return NextResponse.json({ success: false, error: 'Replacement claim cannot be the same as the master claim.'}, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();
        
        // Validate country code (either __ALL_COUNTRIES__ or active country)
        if (market_country_code !== ALL_COUNTRIES_CODE) {
            const { data: countryData } = await supabase
                .from('countries')
                .select('code')
                .eq('code', market_country_code)
                .eq('is_active', true)
                .single();
                
            if (!countryData) {
                return NextResponse.json({ 
                    success: false, 
                    error: `Invalid or inactive country code: ${market_country_code}` 
                }, { status: 400 });
            }
        }

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';
        let userRole = 'viewer'; // default

        if (!hasPermission && target_product_id) {
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('master_brand_id')
                .eq('id', target_product_id)
                .single();

            if (productError || !productData || !productData.master_brand_id) {
                console.error(`[API MarketOverrides POST] Error fetching product/MCB for permissions (Product ID: ${target_product_id}):`, productError);
                // Deny permission if product or its MCB link is not found
            } else {
                const { data: mcbData, error: mcbError } = await supabase
                    .from('master_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.master_brand_id)
                    .single();
                
                if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                    console.error(`[API MarketOverrides POST] Error fetching MCB or MCB not linked for permissions (MCB ID: ${productData.master_brand_id}):`, mcbError);
                    // Deny permission if MCB not found or not linked to a core MixerAI brand
                } else {
                    const { data: permissionsData, error: permissionsError } = await supabase
                        .from('user_brand_permissions')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('brand_id', mcbData.mixerai_brand_id)
                        .single();

                    if (permissionsError) {
                        console.error(`[API MarketOverrides POST] Error fetching user_brand_permissions:`, permissionsError);
                    } else if (permissionsData) {
                        userRole = permissionsData.role;
                        hasPermission = permissionsData.role === 'admin';
                    }
                }
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ success: false, error: 'You do not have permission to create market overrides for this product.' }, { status: 403 });
        }
        
        // Additional permission check for global operations
        if (market_country_code === ALL_COUNTRIES_CODE && userRole !== 'admin') {
            return NextResponse.json({ 
                success: false, 
                error: 'Insufficient permissions for global operations. Admin role required.' 
            }, { status: 403 });
        }
        // --- Permission Check End ---

        // Validate master_claim_id is indeed a __GLOBAL__ claim
        const masterClaimProps = await getClaimProperties(supabase, master_claim_id);
        if (!masterClaimProps) {
            return NextResponse.json({ success: false, error: `Master claim with ID ${master_claim_id} not found.` }, { status: 400 });
        }
        if (masterClaimProps.country_code !== GLOBAL_CLAIM_COUNTRY_CODE) {
            return NextResponse.json({ success: false, error: `Master claim ID ${master_claim_id} is not a global (__GLOBAL__) claim.` }, { status: 400 });
        }

        // If replacement_claim_id is provided, validate it's for the correct market_country_code
        if (replacement_claim_id) {
            const replacementClaimProps = await getClaimProperties(supabase, replacement_claim_id);
            if (!replacementClaimProps) {
                return NextResponse.json({ success: false, error: `Replacement claim with ID ${replacement_claim_id} not found.` }, { status: 400 });
            }
            // For global overrides, replacement claim should be global too
            if (market_country_code === ALL_COUNTRIES_CODE) {
                if (replacementClaimProps.country_code !== GLOBAL_CLAIM_COUNTRY_CODE) {
                    return NextResponse.json({ 
                        success: false, 
                        error: `For global overrides, replacement claim must be global. Claim ${replacement_claim_id} is for country ${replacementClaimProps.country_code}.` 
                    }, { status: 400 });
                }
            } else if (replacementClaimProps.country_code !== market_country_code) {
                return NextResponse.json({ success: false, error: `Replacement claim ID ${replacement_claim_id} is for country ${replacementClaimProps.country_code}, not for the market ${market_country_code}.` }, { status: 400 });
            }
        }
        
        // Check for conflicts
        const conflicts = await checkForConflicts(supabase, {
            masterClaimId: master_claim_id,
            targetProductId: target_product_id,
            marketCountryCode: market_country_code
        });
        
        if (conflicts.hasConflicts && !forceGlobal) return fail(409, 'Conflicts detected', JSON.stringify(conflicts.details));
        
        const newRecord: Omit<MarketClaimOverride, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { created_by: string } = {
            master_claim_id,
            market_country_code,
            target_product_id,
            is_blocked,
            replacement_claim_id: replacement_claim_id || null,
            created_by: user.id,
        };


        const { data, error } = await timed('override-create', async () => await supabase.from('market_claim_overrides').insert(newRecord).select().single());

        if (error) {
            console.error('[API MarketOverrides POST] Error creating market override:', error);
            // Foreign key violation for master_claim_id or target_product_id or replacement_claim_id
            if ((error as { code?: string }).code === '23503') return fail(400, 'Invalid master_claim_id, target_product_id, or replacement_claim_id.');
            // Unique constraint chk_master_claim_is_global, chk_replacement_claim_is_market (Postgres error code for check constraint is 23514)
            // These should be caught by application logic above, but as a fallback:
            if ((error as { code?: string }).code === '23514') return fail(400, 'Database check constraint violated (master claim must be global; replacement must match market).');
             // Unique constraint violation for (master_claim_id, market_country_code, target_product_id)
            if ((error as { code?: string }).code === '23505') return fail(409, 'An override for this master claim, market, and product already exists.');
            return handleApiError(error, 'Failed to create market claim override.');
        }
        
        // Audit global operations
        await logSecurityEvent('market_override_created', {
          overrideId: data.id,
          masterClaimId: master_claim_id,
          marketCountryCode: market_country_code,
          targetProductId: target_product_id,
          isBlocked: is_blocked,
          replacementClaimId: replacement_claim_id,
          conflicts: conflicts.details,
        }, user.id);
        if (market_country_code === ALL_COUNTRIES_CODE) {
            // Get list of active countries
            const { data: activeCountries } = await supabase
                .from('countries')
                .select('code')
                .eq('is_active', true);
                
            await auditGlobalOperation(supabase, {
                overrideId: data.id,
                action: 'created',
                userId: user.id,
                affectedCountries: activeCountries?.map(c => c.code) || [],
                newState: data
            });
        }

        // Prepare normalized response payload
        const payload: { override: MarketClaimOverride; warnings?: unknown } = { override: data as MarketClaimOverride };
        if (conflicts.hasConflicts && forceGlobal) {
            payload.warnings = {
                message: 'Global override created. Some country-specific overrides remain active.',
                conflicts: conflicts.details
            };
        }

        // Invalidate product cache
        try { await invalidateClaimsCacheForProduct(target_product_id); } catch {}
        await logClaimAudit('MARKET_OVERRIDE_CREATED', user.id, (data as any).id, data);
        return ok(payload);

    } catch (error: unknown) {
        console.error('[API MarketOverrides POST] Catched error:', error);
        if (error instanceof Error && error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the market claim override.');
    }
}));

// GET handler for market claim overrides (optional - could be filtered)
export const GET = withCorrelation(withAuth(async (req: NextRequest) => {
    try {
        if (isBuildPhase()) return ok([]);
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


        let query = supabase.from('market_claim_overrides').select(selectQuery);

        if (target_product_id) {

            query = query.eq('target_product_id', target_product_id);
        }
        if (market_country_code) {
            query = query.eq('market_country_code', market_country_code);
        } else if (target_product_id) {
            // When fetching for a product without specific country, include global overrides
            query = query.or(`market_country_code.eq.${ALL_COUNTRIES_CODE},market_country_code.neq.${ALL_COUNTRIES_CODE}`);
        }
        

        const listResult = await timed('override-list', async () => await query.order('created_at', { ascending: false }));
        const { data, error } = listResult as { data: any[]; error: any };

        if (error) {
            console.error('[API MarketOverrides GET] Error fetching market overrides:', error);
            return handleApiError(error, 'Failed to fetch market overrides');
        }

        // Transform data to include flattened claim texts and types
        const enrichedData = data.map((override: unknown) => {
            const o = override as { 
                master_claim?: { claim_text: string; claim_type: string }; 
                replacement_claim?: { claim_text: string; claim_type: string };
                [key: string]: unknown;
            };
            return {
                ...(override as Record<string, unknown>),
                master_claim_text: o.master_claim?.claim_text,
                master_claim_type: o.master_claim?.claim_type,
                replacement_claim_text: o.replacement_claim?.claim_text,
                replacement_claim_type: o.replacement_claim?.claim_type,
                // Remove nested objects if they are not needed by client directly
                master_claim: undefined,
                replacement_claim: undefined,
            };
        });

        return ok(enrichedData);

    } catch (error: unknown) {
        console.error('[API MarketOverrides GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching market overrides.');
    }
})); 
