import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface Product {
    id: string;
    name: string;
    description: string | null;
    global_brand_id: string; // FK, should be required
    created_at?: string;
    updated_at?: string;
}

// GET handler for all products
export const GET = withAuth(async (req: NextRequest, user: User) => {
    // TODO: Implement filtering by global_brand_id if needed as a query param
    // TODO: Implement permission checks - user might only see products for brands they have access to.
    try {
        if (isBuildPhase()) {
            console.log('[API Products GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        const { data, error } = await supabase.from('products')
            .select('*') // Consider selecting specific fields or related data like brand name
            .order('name');

        if (error) {
            console.error('[API Products GET] Error fetching products:', error);
            return handleApiError(error, 'Failed to fetch products');
        }
        
        const validatedData = Array.isArray(data) ? data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            global_brand_id: item.global_brand_id,
            created_at: item.created_at,
            updated_at: item.updated_at
        })) : [];

        return NextResponse.json({ success: true, data: validatedData as Product[] });

    } catch (error: any) {
        console.error('[API Products GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching products.');
    }
});

// POST handler for creating a new product
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { name, description, global_brand_id } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Product name is required and must be a non-empty string.' },
                { status: 400 }
            );
        }
        if (!global_brand_id || typeof global_brand_id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Global Brand ID is required.' },
                { status: 400 }
            );
        }
        if (description && typeof description !== 'string') {
            return NextResponse.json(
               { success: false, error: 'Description must be a string if provided.' },
               { status: 400 }
           );
       }

        const supabase = createSupabaseAdminClient();
        // Permission check: User should be admin or have rights to the global_brand_id.
        // For now, only global admin can create.
        const isAdmin = user?.user_metadata?.role === 'admin'; 
        if (!isAdmin) {
            // TODO: Implement more granular check based on user permissions for the global_brand_id
            console.warn(`[API Products POST] User ${user.id} attempted to create a product without admin privileges.`);
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create a product.' },
                { status: 403 }
            );
        }
        
        const newRecord: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
            name: name.trim(),
            description: description?.trim() || null,
            global_brand_id: global_brand_id
        };

        // @ts-ignore
        const { data, error } = await supabase.from('products')
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error('[API Products POST] Error creating product:', error);
            if ((error as any).code === '23505') { // Unique violation for (global_brand_id, name)
                 return NextResponse.json(
                    { success: false, error: 'A product with this name already exists for this brand.' },
                    { status: 409 } // Conflict
                );
            }
            if ((error as any).code === '23503') { // Foreign key violation for global_brand_id
                return NextResponse.json(
                   { success: false, error: 'Invalid Global Brand ID. The specified brand does not exist.' },
                   { status: 400 } // Bad request
               );
           }
            return handleApiError(error, 'Failed to create product.');
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

        return NextResponse.json({ success: true, data: validatedData }, { status: 201 });

    } catch (error: any) {
        console.error('[API Products POST] Catched error:', error);
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the product.');
    }
}); 