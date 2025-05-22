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

interface RequestContext {
    params: {
        productId: string;
    };
}

// GET handler for fetching all ingredients for a specific product
export const GET = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { productId } = context.params;

    if (!productId || typeof productId !== 'string') {
        return NextResponse.json({ success: false, error: 'Product ID is required and must be a string.' }, { status: 400 });
    }

    // TODO: Permission check - user should have access to the product productId

    try {
        const supabase = createSupabaseAdminClient();

        // Check if product exists first (optional, but good practice)
        // @ts-ignore
        const { data: productData, error: productError } = await supabase.from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productError || !productData) {
            console.warn(`[API /products/${productId}/ingredients GET] Product not found or error checking product:`, productError);
            return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
        }

        // Fetch associated ingredients
        // The query selects all columns from ingredients table by joining through product_ingredients
        // The result will be an array of ingredient objects
        // @ts-ignore
        const { data, error } = await supabase.from('product_ingredients')
            .select('ingredients (*)') // This syntax fetches all columns from the related 'ingredients' table
            .eq('product_id', productId);

        if (error) {
            console.error(`[API /products/${productId}/ingredients GET] Error fetching ingredients for product:`, error);
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

    } catch (error: any) {
        console.error(`[API /products/${productId}/ingredients GET] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred.');
    }
}); 