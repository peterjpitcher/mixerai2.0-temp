import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

interface Ingredient {
    id: string;
    name: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
}


// GET handler for a single ingredient by ID
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Ingredient ID is required.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        const { data, error } = await supabase.from('ingredients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`[API Ingredients GET /${id}] Error fetching ingredient:`, error);
            if (error.code === 'PGRST116') { // PostgREST error for "Fetched 0 rows"
                return NextResponse.json({ success: false, error: 'Ingredient not found.' }, { status: 404 });
            }
            return handleApiError(error, 'Failed to fetch ingredient.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Ingredient not found.' }, { status: 404 });
        }
        
        const singleDataObject = data as Ingredient;
        const validatedData: Ingredient = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: unknown) {
        console.error(`[API Ingredients GET /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while fetching the ingredient.');
    }
});

// PUT handler for updating an ingredient by ID
export const PUT = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Ingredient ID is required for update.' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Ingredient name must be a non-empty string.' },
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
        if (user?.user_metadata?.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update ingredients.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---

        const updateData: Partial<Omit<Ingredient, 'id' | 'created_at'>> & { updated_at: string } = {
            updated_at: new Date().toISOString(),
        };
        if (name) {
            updateData.name = name.trim();
        }
        if (description !== undefined) { // Allows setting description to null or a new string
            updateData.description = description === null ? null : description?.trim();
        }


        const { data, error } = await supabase.from('ingredients')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[API Ingredients PUT /${id}] Error updating ingredient:`, error);
            if ((error as { code?: string }).code === '23505') { // Unique violation for name
                return NextResponse.json(
                   { success: false, error: 'An ingredient with this name already exists.' },
                   { status: 409 } // Conflict
               );
           }
            return handleApiError(error, 'Failed to update ingredient.');
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Ingredient not found or update failed.' }, { status: 404 });
        }

        const singleDataObject = data as Ingredient;
        const validatedData: Ingredient = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData });

    } catch (error: unknown) {
        console.error(`[API Ingredients PUT /${id}] Catched error:`, error);
        if (error instanceof Error && error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while updating the ingredient.');
    }
});

// DELETE handler for an ingredient by ID
export const DELETE = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Ingredient ID is required for deletion.' }, { status: 400 });
    }

    try {
        const supabase = createSupabaseAdminClient();

        // --- Permission Check Start ---
        if (user?.user_metadata?.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete ingredients.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---


        const { error, count } = await supabase.from('ingredients')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error(`[API Ingredients DELETE /${id}] Error deleting ingredient:`, error);
            return handleApiError(error, 'Failed to delete ingredient.');
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Ingredient not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Ingredient deleted successfully.' });

    } catch (error: unknown) {
        console.error(`[API Ingredients DELETE /${id}] Catched error:`, error);
        return handleApiError(error, 'An unexpected error occurred while deleting the ingredient.');
    }
}); 