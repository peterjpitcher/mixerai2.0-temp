// This file was previously src/app/api/global-claim-brands/[id]/route.ts
// Its content has been updated to use 'MasterClaimBrand' and assumes DB table rename.
// This operation is to effectively rename the file by creating it at the new path.
import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

export const dynamic = "force-dynamic";

interface MasterClaimBrand { 
    id: string;
    name: string;
    mixerai_brand_id: string | null;
    created_at?: string;
    updated_at?: string;
}

// GET handler for a single master claim brand by ID
export const GET = withAuth(async (req: NextRequest, _user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();
        // Assuming table will be renamed to 'master_claim_brands'

        const { data, error } = await supabase.from('master_claim_brands') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`[API MasterClaimBrands GET /${id}] Error fetching master claim brand:`, error);
            if (error.code === 'PGRST116') { 
                return NextResponse.json({ success: false, error: 'Master claim brand not found.' }, { status: 404 });
            }
            return handleApiError(error, 'Failed to fetch master claim brand.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Master claim brand not found.' }, { status: 404 });
        }

        const singleDataObject = data as MasterClaimBrand;
        const validatedData: MasterClaimBrand = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: unknown) {
        console.error(`[API MasterClaimBrands GET /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while fetching the master claim brand.');
    }
});

// PUT handler for updating a master claim brand by ID
export const PUT = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required for update.' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { name, mixerai_brand_id: newMixeraiBrandIdInput } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Brand name must be a non-empty string.' },
                { status: 400 }
            );
        }
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

            const { data: mcbData, error: mcbFetchError } = await supabase // Renamed variable
                .from('master_claim_brands') // Renamed table
                .select('mixerai_brand_id')
                .eq('id', id)
                .single();

            if (mcbFetchError) {
                console.error(`[API MasterClaimBrands PUT /${id}] Error fetching MCB for permissions:`, mcbFetchError);
            } else if (!mcbData) {
                console.warn(`[API MasterClaimBrands PUT /${id}] MCB not found during permission check.`);
            } else if (!mcbData.mixerai_brand_id) {
                console.warn(`[API MasterClaimBrands PUT /${id}] MCB ${id} is not linked to any MixerAI brand. Only global admin can manage.`);
            } else {

                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', mcbData.mixerai_brand_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API MasterClaimBrands PUT /${id}] Error fetching user_brand_permissions for MCB ${id} and brand ${mcbData.mixerai_brand_id}:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        }
        
        if (newMixeraiBrandIdInput !== undefined && user?.user_metadata?.role !== 'admin') {
            console.warn(`[API MasterClaimBrands PUT /${id}] Non-admin user ${user.id} attempted to modify mixerai_brand_id.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to change the linked MixerAI Brand ID.' },
                { status: 403 }
            );
        }

        if (!hasPermission) {
            console.warn(`[API MasterClaimBrands PUT /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied for MCB ${id}.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update this master claim brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        const baseUpdateData: { name: string; updated_at: string; mixerai_brand_id?: string | null } = {
            name: name.trim(),
            updated_at: new Date().toISOString(),
        };

        if (newMixeraiBrandIdInput !== undefined && user?.user_metadata?.role === 'admin') {
            baseUpdateData.mixerai_brand_id = newMixeraiBrandIdInput === null ? null : newMixeraiBrandIdInput.toString();
        }
        
        const updateData = { ...baseUpdateData };


        const { data, error } = await supabase.from('master_claim_brands') // Renamed table
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[API MasterClaimBrands PUT /${id}] Error updating master claim brand:`, error);
            if ((error as {code?: string}).code === '23505') { 
                return NextResponse.json(
                   { success: false, error: 'A master claim brand with this name already exists.' },
                   { status: 409 } 
               );
           }
            return handleApiError(error, 'Failed to update master claim brand.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Master claim brand not found or update failed.' }, { status: 404 });
        }
        
        const singleDataObject = data as MasterClaimBrand;
        const validatedData: MasterClaimBrand = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: unknown) {
        console.error(`[API MasterClaimBrands PUT /${id}] Catched error:`, error);
        if (error instanceof Error && error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the master claim brand.');
    }
});

// DELETE handler for a master claim brand by ID
export const DELETE = withAuthAndCSRF(async (req: NextRequest, user: User, context?: unknown): Promise<Response> => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Brand ID is required for deletion.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {

            const { data: mcbData, error: mcbFetchError } = await supabase // Renamed variable
                .from('master_claim_brands') // Renamed table
                .select('mixerai_brand_id')
                .eq('id', id)
                .single();

            if (mcbFetchError) {
                console.error(`[API MasterClaimBrands DELETE /${id}] Error fetching MCB for permissions:`, mcbFetchError);
            } else if (!mcbData) {
                console.warn(`[API MasterClaimBrands DELETE /${id}] MCB not found during permission check.`);
            } else if (!mcbData.mixerai_brand_id) {
                console.warn(`[API MasterClaimBrands DELETE /${id}] MCB ${id} is not linked to any MixerAI brand. Only global admin can manage.`);
            } else {

                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', mcbData.mixerai_brand_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (permissionsError) {
                    console.error(`[API MasterClaimBrands DELETE /${id}] Error fetching user_brand_permissions for MCB ${id} and brand ${mcbData.mixerai_brand_id}:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        }

        if (!hasPermission) {
            console.warn(`[API MasterClaimBrands DELETE /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied for MCB ${id}.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this master claim brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        // Check if there are any claims referencing this master claim brand
        const { count: claimsCount, error: claimsError } = await supabase
            .from('claims')
            .select('*', { count: 'exact', head: true })
            .eq('master_brand_id', id);

        if (claimsError) {
            console.error(`[API MasterClaimBrands DELETE /${id}] Error checking claims:`, claimsError);
            return handleApiError(claimsError, 'Failed to check for existing claims.');
        }

        if (claimsCount && claimsCount > 0) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Cannot delete this master claim brand because it has ${claimsCount} associated claim${claimsCount > 1 ? 's' : ''}. Please delete or reassign the claims first.` 
                },
                { status: 400 }
            );
        }

        const { error, count } = await supabase.from('master_claim_brands') // Renamed table
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error(`[API MasterClaimBrands DELETE /${id}] Error deleting master claim brand:`, error);
            // Check for constraint violation
            if (error.code === '23514' || error.message?.includes('chk_claim_level_reference')) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Cannot delete this master claim brand because it has associated claims. Please delete or reassign the claims first.' 
                    },
                    { status: 400 }
                );
            }
            return handleApiError(error, 'Failed to delete master claim brand.');
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Master claim brand not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Master claim brand deleted successfully.' });

    } catch (error: unknown) {
        console.error(`[API MasterClaimBrands DELETE /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while deleting the master claim brand.');
    }
}); 