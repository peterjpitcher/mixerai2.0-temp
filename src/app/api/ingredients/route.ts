import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
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

// GET handler for all ingredients
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        if (isBuildPhase()) {
            console.log('[API Ingredients GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        // @ts-ignore
        const { data, error } = await supabase.from('ingredients')
            .select('*')
            .order('name');

        if (error) {
            console.error('[API Ingredients GET] Error fetching ingredients:', error);
            return handleApiError(error, 'Failed to fetch ingredients');
        }
        
        const validatedData = Array.isArray(data) ? data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            created_at: item.created_at,
            updated_at: item.updated_at
        })) : [];

        return NextResponse.json({ success: true, data: validatedData as Ingredient[] });

    } catch (error: any) {
        console.error('[API Ingredients GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching ingredients.');
    }
});

// POST handler for creating a new ingredient
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Ingredient name is required and must be a non-empty string.' },
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
        
        // --- Permission Check Start ---
        if (user?.user_metadata?.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create ingredients.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---
        
        const newRecord: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'> = {
            name: name.trim(),
            description: description?.trim() || null
        };

        // @ts-ignore
        const { data, error } = await supabase.from('ingredients')
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error('[API Ingredients POST] Error creating ingredient:', error);
            if ((error as any).code === '23505') { // Unique violation for name
                 return NextResponse.json(
                    { success: false, error: 'An ingredient with this name already exists.' },
                    { status: 409 } // Conflict
                );
            }
            return handleApiError(error, 'Failed to create ingredient.');
        }

        const singleDataObject = data as any;
        const validatedData: Ingredient = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData }, { status: 201 });

    } catch (error: any) {
        console.error('[API Ingredients POST] Catched error:', error);
        if (error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the ingredient.');
    }
}); 