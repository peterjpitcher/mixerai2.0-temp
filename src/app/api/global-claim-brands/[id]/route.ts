import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface GlobalClaimBrand {
    id: string;
    name: string;
    mixerai_brand_id: string | null;
    created_at?: string;
    updated_at?: string;
}

interface RequestContext {
    params: {
        id: string;
    };
}

// GET handler for a single global claim brand by ID
export const GET = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();
        // TODO: Regenerate Supabase types to include 'global_claim_brands' for strong typing.
        // @ts-ignore
        const { data, error } = await supabase.from('global_claim_brands')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`[API GlobalClaimBrands GET /${id}] Error fetching global claim brand:`, error);
            if (error.code === 'PGRST116') { // PostgREST error for "Fetched 0 rows"
                return NextResponse.json({ success: false, error: 'Global claim brand not found.' }, { status: 404 });
            }
            return handleApiError(error, 'Failed to fetch global claim brand.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Global claim brand not found.' }, { status: 404 });
        }

        const singleDataObject = data as any;
        const validatedData: GlobalClaimBrand = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: any) {
        console.error(`[API GlobalClaimBrands GET /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while fetching the global claim brand.');
    }
});

// PUT handler for updating a global claim brand by ID
export const PUT = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required for update.' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { name, mixerai_brand_id: newMixeraiBrandIdInput } = body; // Renamed to avoid conflict

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Brand name must be a non-empty string.' },
                { status: 400 }
            );
        }
        // mixerai_brand_id can be null, but if provided, must be a string.
        if (newMixeraiBrandIdInput !== undefined && newMixeraiBrandIdInput !== null && typeof newMixeraiBrandIdInput !== 'string') {
            return NextResponse.json(
               { success: false, error: 'MixerAI Brand ID must be a string or null if provided.' },
               { status: 400 }
           );
       }

        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // @ts-ignore
            const { data: gcbData, error: gcbFetchError } = await supabase
                .from('global_claim_brands')
                .select('mixerai_brand_id')
                .eq('id', id)
                .single();

            if (gcbFetchError) {
                console.error(`[API GlobalClaimBrands PUT /${id}] Error fetching GCB for permissions:`, gcbFetchError);
                // Let main logic handle 404 if not found, otherwise deny.
            } else if (!gcbData) {
                console.warn(`[API GlobalClaimBrands PUT /${id}] GCB not found during permission check.`);
            } else if (!gcbData.mixerai_brand_id) {
                console.warn(`[API GlobalClaimBrands PUT /${id}] GCB ${id} is not linked to any MixerAI brand. Only global admin can manage.`);
            } else {
                // GCB is linked, check user permission for that mixerai_brand_id
                // @ts-ignore
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', gcbData.mixerai_brand_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API GlobalClaimBrands PUT /${id}] Error fetching user_brand_permissions for GCB ${id} and brand ${gcbData.mixerai_brand_id}:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        }
        
        // If attempting to change mixerai_brand_id and user is not global admin, deny.
        if (newMixeraiBrandIdInput !== undefined && user?.user_metadata?.role !== 'admin') {
            // Fetch current GCB again to compare mixerai_brand_id, or rely on initial fetch if it was successful and stored.
            // For simplicity, if newMixeraiBrandIdInput is in payload and user is not admin, deny if it implies a change.
            // To be absolutely sure, one would re-fetch gcbData here if not already available and compare gcbData.mixerai_brand_id with newMixeraiBrandIdInput.
            // However, the current design is: non-admins cannot change mixerai_brand_id at all.
             // So if newMixeraiBrandIdInput is part of the payload from a non-admin, it implies an attempt to set/change it.
            console.warn(`[API GlobalClaimBrands PUT /${id}] Non-admin user ${user.id} attempted to modify mixerai_brand_id.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to change the linked MixerAI Brand ID.' },
                { status: 403 }
            );
        }

        if (!hasPermission) {
            console.warn(`[API GlobalClaimBrands PUT /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied for GCB ${id}.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update this global claim brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        const baseUpdateData: { name: string; updated_at: string; mixerai_brand_id?: string | null } = {
            name: name.trim(),
            updated_at: new Date().toISOString(),
        };

        // Only global admins can change the mixerai_brand_id link.
        // If newMixeraiBrandIdInput is provided AND user is admin, it's included in updateData.
        if (newMixeraiBrandIdInput !== undefined && user?.user_metadata?.role === 'admin') {
            baseUpdateData.mixerai_brand_id = newMixeraiBrandIdInput === null ? null : newMixeraiBrandIdInput.toString();
        }
        
        const updateData = { ...baseUpdateData };

        // @ts-ignore
        const { data, error } = await supabase.from('global_claim_brands')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[API GlobalClaimBrands PUT /${id}] Error updating global claim brand:`, error);
            if ((error as any).code === '23505') { // Unique violation for name
                return NextResponse.json(
                   { success: false, error: 'A global claim brand with this name already exists.' },
                   { status: 409 } // Conflict
               );
           }
            return handleApiError(error, 'Failed to update global claim brand.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Global claim brand not found or update failed.' }, { status: 404 });
        }
        
        const singleDataObject = data as any;
        const validatedData: GlobalClaimBrand = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: any) {
        console.error(`[API GlobalClaimBrands PUT /${id}] Catched error:`, error);
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the global claim brand.');
    }
});

// DELETE handler for a global claim brand by ID
export const DELETE = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required for deletion.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // @ts-ignore
            const { data: gcbData, error: gcbFetchError } = await supabase
                .from('global_claim_brands')
                .select('mixerai_brand_id')
                .eq('id', id)
                .single();

            if (gcbFetchError) {
                console.error(`[API GlobalClaimBrands DELETE /${id}] Error fetching GCB for permissions:`, gcbFetchError);
                // Let main logic handle 404 if not found, otherwise deny.
            } else if (!gcbData) {
                console.warn(`[API GlobalClaimBrands DELETE /${id}] GCB not found during permission check.`);
            } else if (!gcbData.mixerai_brand_id) {
                console.warn(`[API GlobalClaimBrands DELETE /${id}] GCB ${id} is not linked to any MixerAI brand. Only global admin can manage.`);
            } else {
                // GCB is linked, check user permission for that mixerai_brand_id
                // @ts-ignore
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', gcbData.mixerai_brand_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API GlobalClaimBrands DELETE /${id}] Error fetching user_brand_permissions for GCB ${id} and brand ${gcbData.mixerai_brand_id}:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        }

        if (!hasPermission) {
            console.warn(`[API GlobalClaimBrands DELETE /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied for GCB ${id}.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this global claim brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        // @ts-ignore
        const { error, count } = await supabase.from('global_claim_brands')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error(`[API GlobalClaimBrands DELETE /${id}] Error deleting global claim brand:`, error);
            return handleApiError(error, 'Failed to delete global claim brand.');
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Global claim brand not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Global claim brand deleted successfully.' });

    } catch (error: any) {
        console.error(`[API GlobalClaimBrands DELETE /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while deleting the global claim brand.');
    }
}); 