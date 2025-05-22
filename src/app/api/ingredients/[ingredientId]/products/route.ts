import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// Interface for the product details we want to return
interface ProductDetails {
    id: string;
    name: string;
    description: string | null;
    global_brand_id: string;
    // We can also include the created_at from product_ingredients if needed
    // associated_at: string;
}

interface RequestContext {
    params: {
        ingredientId: string;
    };
}

// GET handler for fetching all products for a specific ingredient
export const GET = withAuth(async (req: NextRequest, user: User, context: RequestContext) => {
    const { ingredientId } = context.params;

    if (!ingredientId || typeof ingredientId !== 'string') {
        return NextResponse.json({ success: false, error: 'Ingredient ID is required and must be a string.' }, { status: 400 });
    }

    // TODO: Permission check - general access to ingredients might be open, or restricted by some criteria.

    try {
        const supabase = createSupabaseAdminClient();

        // Check if ingredient exists first (optional, but good practice)
        // @ts-ignore
        const { data: ingredientData, error: ingredientError } = await supabase.from('ingredients')
            .select('id')
            .eq('id', ingredientId)
            .single();

        if (ingredientError || !ingredientData) {
            console.warn(`[API /ingredients/${ingredientId}/products GET] Ingredient not found or error checking ingredient:`, ingredientError);
            return NextResponse.json({ success: false, error: 'Ingredient not found.' }, { status: 404 });
        }

        // Fetch associated products
        // The query selects all columns from products table by joining through product_ingredients
        // @ts-ignore
        const { data, error } = await supabase.from('product_ingredients')
            .select('products (*)') // Fetches all columns from the related 'products' table
            .eq('ingredient_id', ingredientId);

        if (error) {
            console.error(`[API /ingredients/${ingredientId}/products GET] Error fetching products for ingredient:`, error);
            return handleApiError(error, 'Failed to fetch products for the ingredient.');
        }

        // Data structure: [{ products: { id: '...', name: '...', ... } }, ... ]
        const products: ProductDetails[] = Array.isArray(data) ? data.map((item: any) => {
            if (item.products) { // Check if products object exists
                return {
                    id: item.products.id,
                    name: item.products.name,
                    description: item.products.description,
                    global_brand_id: item.products.global_brand_id,
                    // associated_at: item.created_at // from product_ingredients table if needed
                };
            }
            return null;
        }).filter(Boolean) as ProductDetails[] : [];

        return NextResponse.json({ success: true, data: products });

    } catch (error: any) {
        console.error(`[API /ingredients/${ingredientId}/products GET] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred.');
    }
}); 