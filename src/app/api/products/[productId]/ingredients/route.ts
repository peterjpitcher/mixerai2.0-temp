import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// Interface for the ingredient details we want to return
interface IngredientDetails {
    id: string;
    name: string;
    description: string | null;
    // We can also include the created_at from product_ingredients if needed
    // associated_at: string;
}

// GET handler for fetching all ingredients for a specific product
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { productId: string } };
    const { productId } = params;

    if (!productId || typeof productId !== 'string') { // Changed from id to productId
        return NextResponse.json({ success: false, error: 'Product ID is required and must be a string.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        // Check if product exists and user has access through brand permissions

        const { data: productData, error: productError } = await supabase.from('products')
            .select('id, master_brand_id')
            .eq('id', productId)
            .single();

        if (productError || !productData) {
            console.warn(`[API /products/${productId}/ingredients GET] Product not found or error checking product:`, productError);
            return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }

        // Check if user has permission to access this product's brand
        if (!productData.master_brand_id) {
            return NextResponse.json({ success: false, error: 'Product has no associated brand' }, { status: 400 });
        }

        // First check if user is platform admin
        const isPlatformAdmin = user.user_metadata?.role === 'admin' && await (async () => {
            const { count } = await supabase
                .from('user_brand_permissions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
            return count === 0;
        })();

        if (!isPlatformAdmin) {
            // Get the mixerai_brand_id from master_claim_brands
            const { data: masterBrand, error: masterBrandError } = await supabase
                .from('master_claim_brands')
                .select('mixerai_brand_id')
                .eq('id', productData.master_brand_id)
                .single();

            if (masterBrandError || !masterBrand || !masterBrand.mixerai_brand_id) {
                console.warn(`[API /products/${productId}/ingredients GET] Master brand not linked to MixerAI brand`);
                return NextResponse.json({ success: false, error: 'Product brand configuration error.' }, { status: 403 });
            }
            
            const { data: brandPermission, error: permissionError } = await supabase
                .from('user_brand_permissions')
                .select('id')
                .eq('user_id', user.id)
                .eq('brand_id', masterBrand.mixerai_brand_id)
                .single();

            if (permissionError || !brandPermission) {
                console.warn(`[API /products/${productId}/ingredients GET] User lacks permission to access product brand`);
                return NextResponse.json({ success: false, error: 'Insufficient permissions to access this product.' }, { status: 403 });
            }
        }

        // Fetch associated ingredients
        // The query selects all columns from ingredients table by joining through product_ingredients
        // The result will be an array of ingredient objects

        const { data, error } = await supabase.from('product_ingredients')
            .select('ingredients (*)') // This syntax fetches all columns from the related 'ingredients' table
            .eq('product_id', productId); // Changed from id to productId

        if (error) {
            console.error(`[API /products/${productId}/ingredients GET] Error fetching ingredients for product:`, error); // Changed from id to productId
            return handleApiError(error, 'Failed to fetch ingredients for the product.');
        }

        // The data from Supabase with this type of join will be an array of objects like:
        // [{ ingredients: { id: '...', name: '...', ... } }, ... ]
        // We need to map this to an array of IngredientDetails
        const ingredients: IngredientDetails[] = Array.isArray(data) ? data.map((item: any) => {
            if (item.ingredients) { // Check if ingredients object exists
                return {
                    id: item.ingredients.id,
                    name: item.ingredients.name,
                    description: item.ingredients.description,
                    // associated_at: item.created_at // from product_ingredients table if needed
                };
            }
            return null; // Should not happen if join is correct and FKs are in place
        }).filter(Boolean) as IngredientDetails[] : []; // Filter out any nulls

        return NextResponse.json({ success: true, data: ingredients });

    } catch (error: unknown) {
        console.error(`[API /products/${productId}/ingredients GET] Catched error:`, error); // Changed from id to productId
        return handleApiError(error, 'An unexpected error occurred.');
    }
}); 