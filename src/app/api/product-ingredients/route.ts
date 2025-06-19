import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { canAccessProduct, canAccessIngredient, canEditInBrand } from '@/lib/auth/permissions';

export const dynamic = "force-dynamic";

interface ProductIngredientAssociation {
    product_id: string;
    ingredient_id: string;
    created_at?: string;
}

// POST handler for associating a product with an ingredient
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { product_id, ingredient_id } = body;

        if (!product_id || typeof product_id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Product ID is required and must be a string.' },
                { status: 400 }
            );
        }
        if (!ingredient_id || typeof ingredient_id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Ingredient ID is required and must be a string.' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();
        
        // Check if user can access both the product and ingredient
        const [canAccessProd, canAccessIngr] = await Promise.all([
            canAccessProduct(user.id, product_id, supabase),
            canAccessIngredient(user.id, ingredient_id, supabase)
        ]);
        
        if (!canAccessProd) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to access this product.' },
                { status: 403 }
            );
        }
        
        if (!canAccessIngr) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to access this ingredient.' },
                { status: 403 }
            );
        }
        
        // Check if user has edit permissions for the product's brand
        const { data: product } = await supabase
            .from('products')
            .select('master_brand_id')
            .eq('id', product_id)
            .single();
            
        if (!product || !product.master_brand_id) {
            return NextResponse.json(
                { success: false, error: 'Product not found.' },
                { status: 404 }
            );
        }
        
        // Get the actual brand ID from master_claim_brands
        const { data: masterBrand } = await supabase
            .from('master_claim_brands')
            .select('mixerai_brand_id')
            .eq('id', product.master_brand_id)
            .single();
            
        if (!masterBrand || !masterBrand.mixerai_brand_id) {
            return NextResponse.json(
                { success: false, error: 'Master brand not found.' },
                { status: 404 }
            );
        }
        
        const canEdit = await canEditInBrand(user.id, masterBrand.mixerai_brand_id, supabase);
        if (!canEdit) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to modify this product.' },
                { status: 403 }
            );
        }

        const newAssociation: Omit<ProductIngredientAssociation, 'created_at'> = {
            product_id,
            ingredient_id
        };


        const { data, error } = await supabase.from('product_ingredients')
            .insert(newAssociation)
            .select()
            .single(); // Assuming combination of product_id and ingredient_id is unique

        if (error) {
            console.error('[API ProductIngredients POST] Error creating association:', error);
            if ((error as {code?: string}).code === '23505') { // Unique PK violation
                 return NextResponse.json(
                    { success: false, error: 'This product-ingredient association already exists.' },
                    { status: 409 } // Conflict
                );
            }
            if ((error as {code?: string}).code === '23503') { // Foreign key violation
                return NextResponse.json(
                   { success: false, error: 'Invalid Product ID or Ingredient ID. Ensure both exist.' },
                   { status: 400 } // Bad request - one of the FKs is bad
               );
           }
            return handleApiError(error, 'Failed to create product-ingredient association.');
        }

        const singleDataObject = data as ProductIngredientAssociation;
        const validatedData: ProductIngredientAssociation = {
            product_id: singleDataObject.product_id,
            ingredient_id: singleDataObject.ingredient_id,
            created_at: singleDataObject.created_at
        };

        return NextResponse.json({ success: true, data: validatedData }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API ProductIngredients POST] Catched error:', error);
        if (error instanceof Error && error.name === 'SyntaxError') {
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred.');
    }
});

// DELETE handler for removing a product-ingredient association
export const DELETE = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { product_id, ingredient_id } = body;

        if (!product_id || typeof product_id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Product ID is required and must be a string.' },
                { status: 400 }
            );
        }
        if (!ingredient_id || typeof ingredient_id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Ingredient ID is required and must be a string.' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();
        
        // Check if user can access the product
        const canAccessProd = await canAccessProduct(user.id, product_id, supabase);
        
        if (!canAccessProd) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to access this product.' },
                { status: 403 }
            );
        }
        
        // Check if user has edit permissions for the product's brand
        const { data: product } = await supabase
            .from('products')
            .select('master_brand_id')
            .eq('id', product_id)
            .single();
            
        if (!product || !product.master_brand_id) {
            return NextResponse.json(
                { success: false, error: 'Product not found.' },
                { status: 404 }
            );
        }
        
        // Get the actual brand ID from master_claim_brands
        const { data: masterBrand } = await supabase
            .from('master_claim_brands')
            .select('mixerai_brand_id')
            .eq('id', product.master_brand_id)
            .single();
            
        if (!masterBrand || !masterBrand.mixerai_brand_id) {
            return NextResponse.json(
                { success: false, error: 'Master brand not found.' },
                { status: 404 }
            );
        }
        
        const canEdit = await canEditInBrand(user.id, masterBrand.mixerai_brand_id, supabase);
        if (!canEdit) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to modify this product.' },
                { status: 403 }
            );
        }


        const { error, count } = await supabase.from('product_ingredients')
            .delete({ count: 'exact' })
            .eq('product_id', product_id)
            .eq('ingredient_id', ingredient_id);

        if (error) {
            console.error('[API ProductIngredients DELETE] Error deleting association:', error);
            return handleApiError(error, 'Failed to delete product-ingredient association.');
        }

        if (count === 0) {
            return NextResponse.json(
                { success: false, error: 'Product-ingredient association not found.' }, 
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'Product-ingredient association deleted successfully.' });

    } catch (error: unknown) {
        console.error('[API ProductIngredients DELETE] Catched error:', error);
        if (error instanceof Error && error.name === 'SyntaxError') {
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred.');
    }
}); 