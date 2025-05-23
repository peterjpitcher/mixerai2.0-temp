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
        productId: string; // Changed from id to productId
    };
}

// GET handler for a single product by ID
export const GET = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { productId } = context.params; // Changed from id to productId
    if (!productId) { // Changed from id to productId
        return NextResponse.json({ success: false, error: 'Product ID is required.' }, { status: 400 });
    }
    // TODO: Implement permission checks - user might only see products for brands they have access to.

    try {
        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        const { data, error } = await supabase.from('products')
            .select('*') // Consider joining with global_claim_brands for brand name
            .eq('id', productId) // Changed from id to productId
            .single();

        if (error) {
            console.error(`[API Products GET /${productId}] Error fetching product:`, error); // Changed from id to productId
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
        console.error(`[API Products GET /${productId}] Catched error:`, error); // Changed from id to productId
        return handleApiError(error, 'An unexpected error occurred while fetching the product.');
    }
});

// PUT handler for updating a product by ID
export const PUT = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { productId } = context.params; // Changed from id to productId
    if (!productId) { // Changed from id to productId
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

        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // Fetch the product to get its global_brand_id for permission checking
            // @ts-ignore
            const { data: productData, error: productFetchError } = await supabase
                .from('products')
                .select('global_brand_id')
                .eq('id', productId) // Changed from id to productId
                .single();

            if (productFetchError) {
                console.error(`[API Products PUT /${productId}] Error fetching product for permissions:`, productFetchError); // Changed from id to productId
                // If product not found, the main update logic later will return a 404.
                // If any other error, deny permission.
                // hasPermission remains false.
            } else if (!productData) {
                 console.warn(`[API Products PUT /${productId}] Product not found during permission check.`); // Changed from id to productId
                 // hasPermission remains false. Main logic will 404.
            } else if (!productData.global_brand_id) {
                console.warn(`[API Products PUT /${productId}] Product ${productId} is missing global_brand_id, cannot verify non-admin permission.`); // Changed from id to productId
                // hasPermission remains false.
            } else {
                // Product found and has a global_brand_id, proceed to check GCB link
                // @ts-ignore
                const { data: gcbData, error: gcbError } = await supabase
                    .from('global_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.global_brand_id)
                    .single();
                
                if (gcbError) {
                    console.error(`[API Products PUT /${productId}] Error fetching GCB (ID: ${productData.global_brand_id}) for permissions:`, gcbError); // Changed from id to productId
                    // hasPermission remains false.
                } else if (!gcbData) {
                    console.warn(`[API Products PUT /${productId}] GCB record not found for GCB ID: ${productData.global_brand_id}. Cannot verify non-admin permission.`); // Changed from id to productId
                    // hasPermission remains false.
                } else if (!gcbData.mixerai_brand_id) {
                    console.warn(`[API Products PUT /${productId}] GCB (ID: ${productData.global_brand_id}) is not linked to a mixerai_brand_id. Cannot verify non-admin permission.`); // Changed from id to productId
                    // hasPermission remains false.
                } else {
                    // GCB found and linked to mixerai_brand_id, check user_brand_permissions
                    // @ts-ignore
                    const { data: permissionsData, error: permissionsError } = await supabase
                        .from('user_brand_permissions')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('brand_id', gcbData.mixerai_brand_id) // gcbData.mixerai_brand_id is now guaranteed to be a string
                        .eq('role', 'admin')
                        .limit(1);

                    if (permissionsError) {
                        console.error(`[API Products PUT /${productId}] Error fetching user_brand_permissions:`, permissionsError); // Changed from id to productId
                        // hasPermission remains false.
                    } else if (permissionsData && permissionsData.length > 0) {
                        hasPermission = true;
                    }
                }
            }
        }

        if (!hasPermission) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update this product.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

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
            .eq('id', productId) // Changed from id to productId
            .select()
            .single();

        if (error) {
            console.error(`[API Products PUT /${productId}] Error updating product:`, error); // Changed from id to productId
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
        console.error(`[API Products PUT /${productId}] Catched error:`, error); // Changed from id to productId
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the product.');
    }
});

// DELETE handler for a product by ID
export const DELETE = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { productId } = context.params; // Changed from id to productId
    if (!productId) { // Changed from id to productId
        return NextResponse.json({ success: false, error: 'Product ID is required for deletion.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();
        
        // --- Permission Check Start ---
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission) {
            // Fetch the product to get its global_brand_id for permission checking
            // @ts-ignore
            const { data: productData, error: productFetchError } = await supabase
                .from('products')
                .select('global_brand_id')
                .eq('id', productId) // Changed from id to productId
                .single();

            if (productFetchError) {
                console.error(`[API Products DELETE /${productId}] Error fetching product for permissions:`, productFetchError); // Changed from id to productId
            } else if (!productData) {
                console.warn(`[API Products DELETE /${productId}] Product not found during permission check.`); // Changed from id to productId
            } else if (!productData.global_brand_id) {
                console.warn(`[API Products DELETE /${productId}] Product ${productId} is missing global_brand_id, cannot verify non-admin permission.`); // Changed from id to productId
            } else {
                // @ts-ignore
                const { data: gcbData, error: gcbError } = await supabase
                    .from('global_claim_brands')
                    .select('mixerai_brand_id')
                    .eq('id', productData.global_brand_id)
                    .single();
                
                if (gcbError) {
                    console.error(`[API Products DELETE /${productId}] Error fetching GCB (ID: ${productData.global_brand_id}) for permissions:`, gcbError); // Changed from id to productId
                } else if (!gcbData) {
                    console.warn(`[API Products DELETE /${productId}] GCB record not found for GCB ID: ${productData.global_brand_id}. Cannot verify non-admin permission.`); // Changed from id to productId
                } else if (!gcbData.mixerai_brand_id) {
                    console.warn(`[API Products DELETE /${productId}] GCB (ID: ${productData.global_brand_id}) is not linked to a mixerai_brand_id. Cannot verify non-admin permission.`); // Changed from id to productId
                } else {
                    // @ts-ignore
                    const { data: permissionsData, error: permissionsError } = await supabase
                        .from('user_brand_permissions')
                        .select('role')
                        .eq('user_id', user.id)
                        .eq('brand_id', gcbData.mixerai_brand_id) // gcbData.mixerai_brand_id is guaranteed
                        .eq('role', 'admin')
                        .limit(1);

                    if (permissionsError) {
                        console.error(`[API Products DELETE /${productId}] Error fetching user_brand_permissions:`, permissionsError); // Changed from id to productId
                    } else if (permissionsData && permissionsData.length > 0) {
                        hasPermission = true;
                    }
                }
            }
        }

        if (!hasPermission) {
            console.warn(`[API Products DELETE /${productId}] User ${user.id} (role: ${user?.user_metadata?.role}) permission denied.`); // Changed from id to productId
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this product.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        // @ts-ignore
        const { error, count } = await supabase.from('products')
            .delete({ count: 'exact' })
            .eq('id', productId); // Changed from id to productId

        if (error) {
            console.error(`[API Products DELETE /${productId}] Error deleting product:`, error); // Changed from id to productId
            return handleApiError(error, 'Failed to delete product.');
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Product deleted successfully.' });

    } catch (error: any) {
        console.error(`[API Products DELETE /${productId}] Catched error:`, error); // Changed from id to productId
        return handleApiError(error, 'An unexpected error occurred while deleting the product.');
    }
}); 