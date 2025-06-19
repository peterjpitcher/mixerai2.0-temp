import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { canAccessIngredient } from '@/lib/auth/permissions';

export const dynamic = "force-dynamic";

// Interface for the product details we want to return
interface ProductDetails {
    id: string;
    name: string;
    description: string | null;
    master_brand_id: string;
    // We can also include the created_at from product_ingredients if needed
    // associated_at: string;
}


// GET handler for fetching all products for a specific ingredient
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    const { id } = params;

    if (!id || typeof id !== 'string') {
        return NextResponse.json({ success: false, error: 'Ingredient ID is required and must be a string.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        // Check if ingredient exists first (optional, but good practice)

        const { data: ingredientData, error: ingredientError } = await supabase.from('ingredients')
            .select('id')
            .eq('id', id)
            .single();

        if (ingredientError || !ingredientData) {
            console.warn(`[API /ingredients/${id}/products GET] Ingredient not found or error checking ingredient:`, ingredientError);
            return NextResponse.json({ success: false, error: 'Ingredient not found.' }, { status: 404 });
        }
        
        // Check if user has access to this ingredient
        const hasAccess = await canAccessIngredient(user.id, id, supabase);
        
        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to access this ingredient.' },
                { status: 403 }
            );
        }

        // Fetch associated products
        // The query selects all columns from products table by joining through product_ingredients

        const { data, error } = await supabase.from('product_ingredients')
            .select('products (*)') // Fetches all columns from the related 'products' table
            .eq('ingredient_id', id);

        if (error) {
            console.error(`[API /ingredients/${id}/products GET] Error fetching products for ingredient:`, error);
            return handleApiError(error, 'Failed to fetch products for the ingredient.');
        }

        // Data structure: [{ products: { id: '...', name: '...', ... } }, ... ]
        const products: ProductDetails[] = Array.isArray(data) ? data.map((item: unknown) => {
            const itemTyped = item as { products?: ProductDetails };
            if (itemTyped.products) { // Check if products object exists
                return {
                    id: itemTyped.products.id,
                    name: itemTyped.products.name,
                    description: itemTyped.products.description,
                    master_brand_id: itemTyped.products.master_brand_id,
                    // associated_at: item.created_at // from product_ingredients table if needed
                };
            }
            return null;
        }).filter(Boolean) as ProductDetails[] : [];

        return NextResponse.json({ success: true, data: products });

    } catch (error: unknown) {
        console.error(`[API /ingredients/${id}/products GET] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred.');
    }
}); 