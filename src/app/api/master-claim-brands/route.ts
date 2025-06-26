// This file was previously src/app/api/global-claim-brands/route.ts
// Its content has been updated to use 'MasterClaimBrand' and assumes DB table rename.
// This operation is to effectively rename the file by creating it at the new path.
import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
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
    brand_color?: string | null;
    logo_url?: string | null;
}

// GET handler for all master claim brands
export const GET = withAuth(async () => {
    try {
        if (isBuildPhase()) {
            console.log('[API MasterClaimBrands GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        // Assuming table will be renamed to 'master_claim_brands'
        const { data, error } = await supabase.from('master_claim_brands') 
            .select(`
                *,
                brands:mixerai_brand_id (
                    brand_color,
                    logo_url
                )
            `)
            .order('name');

        if (error) {
            console.error('[API MasterClaimBrands GET] Error fetching master claim brands:', error);
            return handleApiError(error, 'Failed to fetch master claim brands');
        }

        const validatedData = Array.isArray(data) ? data.map((item: Record<string, unknown>) => ({
            id: item.id,
            name: item.name,
            mixerai_brand_id: item.mixerai_brand_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            brand_color: (item.brands as Record<string, unknown>)?.brand_color || null,
            logo_url: (item.brands as Record<string, unknown>)?.logo_url || null
        })) : [];

        return NextResponse.json({ success: true, data: validatedData as MasterClaimBrand[] });

    } catch (error: unknown) {
        console.error('[API MasterClaimBrands GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching master claim brands.');
    }
});

// POST handler for creating a new master claim brand
export const POST = withAuthAndCSRF(async (req: NextRequest, user: User): Promise<Response> => {
    try {
        const body = await req.json();
        const { name, mixerai_brand_id } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Brand name is required and must be a non-empty string.' },
                { status: 400 }
            );
        }
        if (mixerai_brand_id !== undefined && mixerai_brand_id !== null && typeof mixerai_brand_id !== 'string') {
             return NextResponse.json(
                { success: false, error: 'MixerAI Brand ID must be a string or null if provided.' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission && mixerai_brand_id) { 
            const { data: permissionsData, error: permissionsError } = await supabase
                .from('user_brand_permissions')
                .select('role')
                .eq('user_id', user.id)
                .eq('brand_id', mixerai_brand_id)
                .eq('role', 'admin')
                .limit(1);

            if (permissionsError) {
                console.error(`[API MasterClaimBrands POST] Error checking permissions for user ${user.id} and brand ${mixerai_brand_id}:`, permissionsError);
            } else if (permissionsData && permissionsData.length > 0) {
                hasPermission = true;
            }
        } else if (!hasPermission && !mixerai_brand_id) {
            // Non-admin cannot create an unlinked master claim brand
        }
        
        if (!hasPermission) {
            console.warn(`[API MasterClaimBrands POST] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied to create master claim brand with name "${name}" and mixerai_brand_id "${mixerai_brand_id}".`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create this master claim brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---
        
        const newRecord: Omit<MasterClaimBrand, 'id' | 'created_at' | 'updated_at'> = {
            name: name.trim(),
            mixerai_brand_id: mixerai_brand_id || null
        };

        // Assuming table will be renamed to 'master_claim_brands'
        const { data, error } = await supabase.from('master_claim_brands') 
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error('[API MasterClaimBrands POST] Error creating master claim brand:', error);
            if ((error as {code?: string}).code === '23505') { 
                 return NextResponse.json(
                    { success: false, error: 'A master claim brand with this name already exists.' },
                    { status: 409 } 
                );
            }
            return handleApiError(error, 'Failed to create master claim brand.');
        }

        const singleDataObject = data as MasterClaimBrand;
        const validatedSingleData = singleDataObject ? {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        } : null;

        return NextResponse.json({ success: true, data: validatedSingleData as MasterClaimBrand }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API MasterClaimBrands POST] Catched error:', error);
        if (error instanceof Error && error.name === 'SyntaxError') { 
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the master claim brand.');
    }
}); 