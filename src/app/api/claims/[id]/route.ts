import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { withCorrelation } from '@/lib/observability/with-correlation';
import { User } from '@supabase/supabase-js';
import { hasAccessToBrand, canAccessProduct, canAccessIngredient } from '@/lib/auth/permissions';
import { ok, fail } from '@/lib/http/response';
import { ALL_COUNTRIES_CODE, GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { logClaimAudit } from '@/lib/audit';

export const dynamic = "force-dynamic";

// ENUM types mirroring the database
type ClaimTypeEnum = 'allowed' | 'disallowed';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
    id: string;
    claim_text: string;
    claim_type: ClaimTypeEnum;
    level: ClaimLevelEnum;
    master_brand_id?: string | null;
    product_id?: string | null;
    ingredient_id?: string | null;
    country_code: string;
    description?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface RequestContext {
    params: {
        id: string; // Claim ID
    };
}

// GET handler for a single claim by ID
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as RequestContext;
    const { id } = params;
    if (!id) return fail(400, 'Claim ID is required.');

    try {
        const supabase = createSupabaseAdminClient();

        const { data, error } = await supabase.from('claims')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if ((error as any).code === 'PGRST116') return fail(404, 'Claim not found.');
            return handleApiError(error, 'Failed to fetch claim.');
        }
        if (!data) return fail(404, 'Claim not found.');
        
        // Permission check based on claim level
        const isAdmin = user?.user_metadata?.role === 'admin';
        let hasPermission = isAdmin;
        
        if (!hasPermission) {
            if (data.level === 'brand' && data.master_brand_id) {
                // For brand-level claims, check if user has access to the brand
                const { data: mcbData } = await supabase
                    .from('master_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', data.master_brand_id)
                    .single();
                    
                if (mcbData?.mixerai_brand_id) {
                    hasPermission = await hasAccessToBrand(user.id, mcbData.mixerai_brand_id, supabase);
                }
            } else if (data.level === 'product' && data.product_id) {
                // For product-level claims, check if user has access to the product
                hasPermission = await canAccessProduct(user.id, data.product_id, supabase);
            } else if (data.level === 'ingredient' && data.ingredient_id) {
                // For ingredient-level claims, check if user has access to the ingredient
                hasPermission = await canAccessIngredient(user.id, data.ingredient_id, supabase);
            }
        }
        
        if (!hasPermission) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to access this claim.' },
                { status: 403 }
            );
        }
        
        const singleDataObject = data as Record<string, unknown>;
        const validatedData: Claim = {
            id: singleDataObject.id as string,
            claim_text: singleDataObject.claim_text as string,
            claim_type: singleDataObject.claim_type as ClaimTypeEnum,
            level: singleDataObject.level as ClaimLevelEnum,
            master_brand_id: singleDataObject.master_brand_id as string | null,
            product_id: singleDataObject.product_id as string | null,
            ingredient_id: singleDataObject.ingredient_id as string | null,
            country_code: singleDataObject.country_code as string,
            description: singleDataObject.description as string | null,
            created_by: singleDataObject.created_by as string | null,
            created_at: singleDataObject.created_at as string,
            updated_at: singleDataObject.updated_at as string
        };

        return ok(validatedData);

    } catch (error: unknown) {
        console.error(`[API Claims GET /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while fetching the claim.');
    }
});

// PUT handler for updating a claim by ID
export const PUT = withCorrelation(withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as RequestContext;
    const { id } = params;
    if (!id) return fail(400, 'Claim ID is required for update.');

    try {
        const body = await req.json();
        const { claim_text, claim_type, description, country_code, product_ids, ingredient_ids, country_codes } = body as any;

        // Level and associated entity IDs (product_id, master_brand_id, ingredient_id) are not updatable here.
        // To change those, one would typically delete and recreate the claim if necessary.

        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (claim_text !== undefined) {
            if (typeof claim_text !== 'string' || claim_text.trim() === '') {
                return NextResponse.json({ success: false, error: 'Claim text must be a non-empty string.' }, { status: 400 });
            }
            updatePayload.claim_text = claim_text.trim();
        }
        if (claim_type !== undefined) {
            if (!['allowed', 'disallowed'].includes(claim_type)) {
                return fail(400, 'Invalid claim_type.');
            }
            updatePayload.claim_type = claim_type;
        }
        if (description !== undefined) { // Allows setting description to null or a new string
            if (description !== null && typeof description !== 'string') {
                 return NextResponse.json({ success: false, error: 'Description must be a string or null.' }, { status: 400 });
            }
            updatePayload.description = description === null ? null : description.trim();
        }
        // Legacy country_code is ignored in favor of junctions. Use country_codes array below.

        if (Object.keys(updatePayload).length === 1 && updatePayload.updated_at) {
            // Only updated_at is present, meaning no actual updatable fields were provided
            return NextResponse.json({ success: false, error: 'No updatable fields provided.' }, { status: 400 });
        }

        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // Fetch the claim to determine its context for permission checking

            const { data: claimData, error: claimFetchError } = await supabase
                .from('claims')
                .select('level, master_brand_id, product_id, created_by')
                .eq('id', id)
                .single();

            if (claimFetchError || !claimData) {
                console.error(`[API Claims PUT /${id}] Error fetching claim for permissions:`, claimFetchError);
                return handleApiError(claimFetchError || new Error('Claim not found for permission check'), 'Failed to verify claim for permissions.');
            }

            // Allow if user is the creator of the claim
            if (claimData.created_by === user.id) {
                hasPermission = true;
            }

            if (!hasPermission && claimData) { 
                let coreBrandId: string | null = null;
                if (claimData.level === 'brand' && claimData.master_brand_id) { 

                    const { data: mcbData, error: mcbError } = await supabase 
                        .from('master_claim_brands') 
                        .select('mixerai_brand_id')
                        .eq('id', claimData.master_brand_id) 
                        .single();
                    if (mcbError || !mcbData) {
                        console.error(`[API Claims PUT /${id}] Error fetching MCB for brand-level claim permissions:`, mcbError);
                    } else {
                        coreBrandId = mcbData.mixerai_brand_id;
                    }
                } else if (claimData.level === 'product' && claimData.product_id) {

                    const { data: productData, error: productError } = await supabase
                        .from('products')
                        .select('master_brand_id') 
                        .eq('id', claimData.product_id)
                        .single();
                    if (productError || !productData || !productData.master_brand_id) {
                        console.error(`[API Claims PUT /${id}] Error fetching product/MCB for product-level claim permissions:`, productError);
                    } else {

                        const { data: mcbData, error: mcbError } = await supabase 
                            .from('master_claim_brands') 
                            .select('mixerai_brand_id')
                            .eq('id', productData.master_brand_id) 
                            .single();
                        if (mcbError || !mcbData) {
                            console.error(`[API Claims PUT /${id}] Error fetching MCB for product-level claim (via product) permissions:`, mcbError);
                        } else {
                            coreBrandId = mcbData.mixerai_brand_id;
                        }
                    }
                } else if (claimData.level === 'ingredient') {
                    // For ingredient-level claims, only global admin (already checked) or creator can modify for now.
                    // hasPermission would be true if creator, or if already global admin.
                }

                if (coreBrandId) {

                    const { data: permissionsData, error: permissionsError } = await supabase
                        .from('user_brand_permissions')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('brand_id', coreBrandId)
                        .eq('role', 'admin') // Must be a brand admin
                        .limit(1);
                    if (permissionsError) {
                        console.error(`[API Claims PUT /${id}] Error fetching user_brand_permissions:`, permissionsError);
                    } else if (permissionsData && permissionsData.length > 0) {
                        hasPermission = true;
                    }
                }
            }
        }

        if (!hasPermission) return fail(403, 'You do not have permission to update this claim.');
        // --- Permission Check End ---


        const { data, error } = await supabase.from('claims')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[API Claims PUT /${id}] Error updating claim:`, error);
            if ((error as any).code === '23505') return fail(409, 'This update would result in a duplicate claim.');
            // Note: CHECK constraint chk_claim_level_reference is not relevant here as level/FKs are not changed.
            return handleApiError(error, 'Failed to update claim.');
        }

        if (!data) {
            return fail(404, 'Claim not found or update failed.');
        }

        const singleDataObject = data as Record<string, unknown>;
        const validatedData: Claim = {
            id: singleDataObject.id as string,
            claim_text: singleDataObject.claim_text as string,
            claim_type: singleDataObject.claim_type as ClaimTypeEnum,
            level: singleDataObject.level as ClaimLevelEnum,
            master_brand_id: singleDataObject.master_brand_id as string | null,
            product_id: singleDataObject.product_id as string | null,
            ingredient_id: singleDataObject.ingredient_id as string | null,
            country_code: singleDataObject.country_code as string,
            description: singleDataObject.description as string | null,
            created_by: singleDataObject.created_by as string | null,
            created_at: singleDataObject.created_at as string,
            updated_at: singleDataObject.updated_at as string
        };

        // Optional: update associations if arrays were provided
        if (Array.isArray(product_ids)) {
          // Replace product associations
          await supabase.from('claim_products').delete().eq('claim_id', id);
          const rows = product_ids.map((pid: string) => ({ claim_id: id, product_id: pid }));
          if (rows.length) await supabase.from('claim_products').insert(rows);
        }
        if (Array.isArray(ingredient_ids)) {
          // Replace ingredient associations if table exists
          try {
            await supabase.from('claim_ingredients').delete().eq('claim_id', id);
            const rows = ingredient_ids.map((iid: string) => ({ claim_id: id, ingredient_id: iid }));
            if (rows.length) await supabase.from('claim_ingredients').insert(rows);
          } catch {}
        }
        if (Array.isArray(country_codes)) {
          const mapped = country_codes.map((cc: string) => cc === ALL_COUNTRIES_CODE ? GLOBAL_CLAIM_COUNTRY_CODE : cc);
          // Validate countries except GLOBAL
          const real = mapped.filter((cc: string) => cc !== GLOBAL_CLAIM_COUNTRY_CODE);
          if (real.length) {
            const { data: countries, error: cErr } = await supabase.from('countries').select('code').in('code', real);
            if (cErr) return fail(500, 'Failed to validate country codes', cErr.message);
            const found = new Set((countries ?? []).map((c: any) => c.code));
            const missing = real.filter((c: string) => !found.has(c));
            if (missing.length) return fail(400, `Invalid country codes: ${missing.join(', ')}`);
          }
          await supabase.from('claim_countries').delete().eq('claim_id', id);
          const rows = mapped.map((cc: string) => ({ claim_id: id, country_code: cc }));
          if (rows.length) await supabase.from('claim_countries').insert(rows);
        }

        await logClaimAudit('CLAIM_UPDATED', user.id, id, { claim_text, claim_type });
        // Invalidate caches for affected product(s)
        try {
          let pids: string[] = Array.isArray(product_ids) && product_ids.length ? product_ids : [];
          if (!pids.length) {
            const { data: cps } = await supabase
              .from('claim_products')
              .select('product_id')
              .eq('claim_id', id);
            pids = (cps || []).map((r: any) => r.product_id).filter(Boolean);
          }
          if (pids.length) {
            const { invalidateClaimsCacheForProduct } = await import('@/lib/claims-service');
            await Promise.all(pids.map(pid => invalidateClaimsCacheForProduct(pid)));
          }
        } catch {}
        return ok(validatedData);

    } catch (error: unknown) {
        console.error(`[API Claims PUT /${id}] Catched error:`, error);
        if ((error as Error).name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the claim.');
    }
}));

// DELETE handler for a claim by ID
export const DELETE = withCorrelation(withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as RequestContext;
    const { id } = params;
    if (!id) return fail(400, 'Claim ID is required for deletion.');

    try {
        const supabase = createSupabaseAdminClient();
        
        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // Fetch the claim to determine its context for permission checking

            const { data: claimData, error: claimFetchError } = await supabase
                .from('claims')
                .select('level, master_brand_id, product_id, created_by')
                .eq('id', id)
                .single();

            if (claimFetchError) { 
                console.error(`[API Claims DELETE /${id}] Error fetching claim for permissions:`, claimFetchError);
                return handleApiError(claimFetchError, 'Failed to verify claim for permissions before deletion.');
            }
            if (!claimData) { // Claim not found, let the actual delete call handle the 404 or specific error.
                // Proceed to delete attempt which will fail if claim not found or if other error occurs
            } else {
                if (claimData.created_by === user.id) {
                    hasPermission = true;
                }

                if (!hasPermission && claimData) { 
                    let coreBrandId: string | null = null;
                    if (claimData.level === 'brand' && claimData.master_brand_id) { 

                        const { data: mcbData, error: mcbError } = await supabase 
                            .from('master_claim_brands') 
                            .select('mixerai_brand_id')
                            .eq('id', claimData.master_brand_id) 
                            .single();
                        if (mcbError || !mcbData) {
                            console.error(`[API Claims DELETE /${id}] Error fetching MCB for brand-level claim permissions:`, mcbError);
                        } else {
                            coreBrandId = mcbData.mixerai_brand_id;
                        }
                    } else if (claimData.level === 'product' && claimData.product_id) {

                        const { data: productData, error: productError } = await supabase
                            .from('products')
                            .select('master_brand_id') 
                            .eq('id', claimData.product_id)
                            .single();
                        if (productError || !productData || !productData.master_brand_id) {
                            console.error(`[API Claims DELETE /${id}] Error fetching product/MCB for product-level claim permissions:`, productError);
                        } else {

                            const { data: mcbData, error: mcbError } = await supabase 
                                .from('master_claim_brands') 
                                .select('mixerai_brand_id')
                                .eq('id', productData.master_brand_id) 
                                .single();
                            if (mcbError || !mcbData) {
                                console.error(`[API Claims DELETE /${id}] Error fetching MCB for product-level claim (via product) permissions:`, mcbError);
                            } else {
                                coreBrandId = mcbData.mixerai_brand_id;
                            }
                        }
                    } 

                    if (coreBrandId) {

                        const { data: permissionsData, error: permissionsError } = await supabase
                            .from('user_brand_permissions')
                            .select('role')
                            .eq('user_id', user.id)
                            .eq('brand_id', coreBrandId)
                            .eq('role', 'admin') 
                            .limit(1);
                        if (permissionsError) {
                            console.error(`[API Claims DELETE /${id}] Error fetching user_brand_permissions:`, permissionsError);
                        } else if (permissionsData && permissionsData.length > 0) {
                            hasPermission = true;
                        }
                    }
                }
            }
        }

        if (!hasPermission) return fail(403, 'You do not have permission to delete this claim.');
        // --- Permission Check End ---


        // First, delete any workflow history entries for this claim
        const { error: historyError } = await supabase.from('claim_workflow_history')
            .delete()
            .eq('claim_id', id);

        if (historyError) {
            console.error(`[API Claims DELETE /${id}] Error deleting claim workflow history:`, historyError);
            // Continue with claim deletion even if history deletion fails
        }

        // Fetch associated product ids before delete for cache invalidation
        let pids: string[] = [];
        try {
          const { data: cps } = await supabase
            .from('claim_products')
            .select('product_id')
            .eq('claim_id', id);
          pids = (cps || []).map((r: any) => r.product_id).filter(Boolean);
        } catch {}

        // Now delete the claim itself
        const { error, count } = await supabase.from('claims')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error(`[API Claims DELETE /${id}] Error deleting claim:`, error);
            return handleApiError(error, 'Failed to delete claim.');
        }

        if (count === 0) return fail(404, 'Claim not found.');

        await logClaimAudit('CLAIM_DELETED', user.id, id);
        try {
          if (pids.length) {
            const { invalidateClaimsCacheForProduct } = await import('@/lib/claims-service');
            await Promise.all(pids.map(pid => invalidateClaimsCacheForProduct(pid)));
          }
        } catch {}
        return ok({ message: 'Claim and any pending approvals deleted successfully.' });

    } catch (error: unknown) {
        console.error(`[API Claims DELETE /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while deleting the claim.');
    }
})); 
