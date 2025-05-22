import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
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

// GET handler for all global claim brands
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        if (isBuildPhase()) {
            console.log('[API GlobalClaimBrands GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        // TODO: Regenerate Supabase types to include 'global_claim_brands' for strong typing.
        // Using @ts-ignore as a temporary measure due to outdated Supabase types.
        // @ts-ignore
        const { data, error } = await supabase.from('global_claim_brands')
            .select('*')
            .order('name');

        if (error) {
            console.error('[API GlobalClaimBrands GET] Error fetching global claim brands:', error);
            return handleApiError(error, 'Failed to fetch global claim brands');
        }

        const validatedData = Array.isArray(data) ? data.map((item: any) => ({
            id: item.id,
            name: item.name,
            mixerai_brand_id: item.mixerai_brand_id,
            created_at: item.created_at,
            updated_at: item.updated_at
        })) : [];

        return NextResponse.json({ success: true, data: validatedData as GlobalClaimBrand[] });

    } catch (error: any) {
        console.error('[API GlobalClaimBrands GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching global claim brands.');
    }
});

// POST handler for creating a new global claim brand
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { name, mixerai_brand_id } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Brand name is required and must be a non-empty string.' },
                { status: 400 }
            );
        }
        if (mixerai_brand_id && typeof mixerai_brand_id !== 'string') {
             return NextResponse.json(
                { success: false, error: 'MixerAI Brand ID must be a string if provided.' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();
        const isAdmin = user?.user_metadata?.role === 'admin';
        if (!isAdmin) {
            console.warn(`[API GlobalClaimBrands POST] User ${user.id} (role: ${user?.user_metadata?.role}) attempted to create a global claim brand without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create a global claim brand.' },
                { status: 403 }
            );
        }
        
        const newRecord: Omit<GlobalClaimBrand, 'id' | 'created_at' | 'updated_at'> = {
            name: name.trim(),
            mixerai_brand_id: mixerai_brand_id || null
        };

        // TODO: Regenerate Supabase types to include 'global_claim_brands' for strong typing.
        // Using @ts-ignore as a temporary measure due to outdated Supabase types.
        // @ts-ignore
        const { data, error } = await supabase.from('global_claim_brands')
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error('[API GlobalClaimBrands POST] Error creating global claim brand:', error);
            if ((error as any).code === '23505') { // Unique violation
                 return NextResponse.json(
                    { success: false, error: 'A global claim brand with this name already exists.' },
                    { status: 409 } // Conflict
                );
            }
            return handleApiError(error, 'Failed to create global claim brand.');
        }

        const singleDataObject = data as any;
        const validatedSingleData = singleDataObject ? {
            id: singleDataObject.id,
            name: singleDataObject.name,
            mixerai_brand_id: singleDataObject.mixerai_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        } : null;

        return NextResponse.json({ success: true, data: validatedSingleData as GlobalClaimBrand }, { status: 201 });

    } catch (error: any) {
        console.error('[API GlobalClaimBrands POST] Catched error:', error);
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the global claim brand.');
    }
}); 