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
        const { name, mixerai_brand_id } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Brand name must be a non-empty string.' },
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
        // TODO: Add more granular permission check: user must be admin or have specific rights on the linked mixerai_brand_id
        if (!isAdmin) {
            console.warn(`[API GlobalClaimBrands PUT /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) attempted to update global claim brand without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update this global claim brand.' },
                { status: 403 }
            );
        }

        const updateData: Partial<Omit<GlobalClaimBrand, 'id' | 'created_at' | 'updated_at'>> & { updated_at: string } = {
            name: name.trim(),
            updated_at: new Date().toISOString(),
        };
        if (mixerai_brand_id !== undefined) { // Allow unsetting or setting mixerai_brand_id
            updateData.mixerai_brand_id = mixerai_brand_id;
        }

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
        const isAdmin = user?.user_metadata?.role === 'admin';
        // TODO: Add more granular permission check
        if (!isAdmin) {
            console.warn(`[API GlobalClaimBrands DELETE /${id}] User ${user.id} (role: ${user?.user_metadata?.role}) attempted to delete global claim brand without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this global claim brand.' },
                { status: 403 }
            );
        }

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