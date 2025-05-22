import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface Product {
    id: string;
    name: string;
    description: string | null;
    global_brand_id: string;
    created_at?: string;
    updated_at?: string;
}

interface RequestContext {
    params: {
        id: string;
    };
}

// GET handler for a single product by ID
export const GET = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Product ID is required.' }, { status: 400 });
    }
    // TODO: Implement permission checks - user might only see products for brands they have access to.

    try {
        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        const { data, error } = await supabase.from('products')
            .select('*') // Consider joining with global_claim_brands for brand name
            .eq('id', id)
            .single();

        if (error) {
            console.error(`[API Products GET /${id}] Error fetching product:`, error);
            if (error.code === 'PGRST116') { 
                return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
            }
            return handleApiError(error, 'Failed to fetch product.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }
        
        const singleDataObject = data as any;
        const validatedData: Product = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            global_brand_id: singleDataObject.global_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: any) {
        console.error(`[API Products GET /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while fetching the product.');
    }
});

// PUT handler for updating a product by ID
export const PUT = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Product ID is required for update.' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { name, description } = body;

        // global_brand_id is not updatable via this endpoint for simplicity.
        // If it needs to be updatable, careful consideration of permissions and implications is needed.

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Product name must be a non-empty string.' },
                { status: 400 }
            );
        }
        if (description !== undefined && (description !== null && typeof description !== 'string')) {
            return NextResponse.json(
               { success: false, error: 'Description must be a string or null if provided.' },
               { status: 400 }
           );
       }

        const supabase = createSupabaseAdminClient();
        // Permission check: User should be admin or have rights to the product's global_brand_id.
        // For now, only global admin can update.
        const isAdmin = user?.user_metadata?.role === 'admin'; 
        if (!isAdmin) {
             // TODO: Implement more granular check based on user permissions for the product's global_brand_id
            console.warn(`[API Products PUT /${id}] User ${user.id} attempted to update product without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update this product.' },
                { status: 403 }
            );
        }

        const updateData: Partial<Omit<Product, 'id' | 'created_at' | 'global_brand_id'>> & { updated_at: string } = {
            updated_at: new Date().toISOString(),
        };
        if (name) {
            updateData.name = name.trim();
        }
        if (description !== undefined) {
            updateData.description = description === null ? null : description?.trim();
        }

        // @ts-ignore
        const { data, error } = await supabase.from('products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[API Products PUT /${id}] Error updating product:`, error);
            // Check for unique constraint on (name, global_brand_id). Need existing global_brand_id for this.
            // This requires fetching the product first to get its global_brand_id if name is changing.
            // For simplicity, if a unique error occurs, we give a general message.
            // A more specific check would involve first fetching the product to see if name is being changed to one that conflicts within its existing brand.
            if ((error as any).code === '23505') { 
                return NextResponse.json(
                   { success: false, error: 'A product with this name may already exist for the associated brand.' },
                   { status: 409 } // Conflict
               );
           }
            return handleApiError(error, 'Failed to update product.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Product not found or update failed.' }, { status: 404 });
        }

        const singleDataObject = data as any;
        const validatedData: Product = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            global_brand_id: singleDataObject.global_brand_id,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: any) {
        console.error(`[API Products PUT /${id}] Catched error:`, error);
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the product.');
    }
});

// DELETE handler for a product by ID
export const DELETE = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { id } = context.params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Product ID is required for deletion.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();
        // Permission check: User should be admin or have rights to the product's global_brand_id.
        // For now, only global admin can delete.
        const isAdmin = user?.user_metadata?.role === 'admin'; 
        if (!isAdmin) {
            // TODO: Implement more granular check based on user permissions for the product's global_brand_id
            console.warn(`[API Products DELETE /${id}] User ${user.id} attempted to delete product without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this product.' },
                { status: 403 }
            );
        }

        // @ts-ignore
        const { error, count } = await supabase.from('products')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error(`[API Products DELETE /${id}] Error deleting product:`, error);
            return handleApiError(error, 'Failed to delete product.');
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Product deleted successfully.' });

    } catch (error: any) {
        console.error(`[API Products DELETE /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while deleting the product.');
    }
}); 