import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { getUserAccessibleBrands, isPlatformAdmin } from '@/lib/auth/permissions';

export const dynamic = "force-dynamic";

interface Product {
    id: string;
    name: string;
    description: string | null;
    master_brand_id: string; // Renamed from global_brand_id, FK, should be required
    created_at?: string;
    updated_at?: string;
}

// GET handler for all products with pagination
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        // Parse pagination parameters from query string
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const search = searchParams.get('search') || '';
        
        // Validate pagination parameters
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(Math.max(1, limit), 1000); // Max 1000 items per page
        const offset = (validatedPage - 1) * validatedLimit;
        if (isBuildPhase()) {
            console.log('[API Products GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        
        // Check if user is platform admin
        const isPlatAdmin = await isPlatformAdmin(user, supabase);
        
        // Get user's accessible brands if not platform admin
        let accessibleMasterBrandIds: string[] = [];
        if (!isPlatAdmin) {
            // Get user's MixerAI brand permissions
            const mixerAIBrandIds = await getUserAccessibleBrands(user.id, supabase);
            
            console.log('[API Products GET] User MixerAI brand IDs:', mixerAIBrandIds);
            
            // If user has no brand access, return empty result
            if (mixerAIBrandIds.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: validatedPage,
                        limit: validatedLimit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                });
            }
            
            // Get master claim brands linked to these MixerAI brands
            const { data: masterBrands, error: masterBrandsError } = await supabase
                .from('master_claim_brands')
                .select('id, mixerai_brand_id')
                .in('mixerai_brand_id', mixerAIBrandIds);
                
            console.log('[API Products GET] Master brands found:', masterBrands);
                
            if (masterBrandsError) {
                console.error('[API Products GET] Error fetching master brands:', masterBrandsError);
                return handleApiError(masterBrandsError, 'Failed to fetch brand associations');
            }
            
            accessibleMasterBrandIds = masterBrands?.map(mb => mb.id) || [];
            
            // Also check if any of the user's brands have a master_claim_brand_id set
            const { data: brandsWithMasterClaim, error: brandsError } = await supabase
                .from('brands')
                .select('master_claim_brand_id')
                .in('id', mixerAIBrandIds)
                .not('master_claim_brand_id', 'is', null);
                
            if (!brandsError && brandsWithMasterClaim) {
                const additionalMasterBrandIds = brandsWithMasterClaim
                    .map(b => b.master_claim_brand_id)
                    .filter(id => id && !accessibleMasterBrandIds.includes(id));
                accessibleMasterBrandIds.push(...additionalMasterBrandIds);
            }
            
            console.log('[API Products GET] Accessible master brand IDs:', accessibleMasterBrandIds);
            
            // If no master brands found for user's MixerAI brands, return empty
            if (accessibleMasterBrandIds.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: validatedPage,
                        limit: validatedLimit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                });
            }
        }
        
        // Build query with pagination
        let query = supabase.from('products')
            .select('*', { count: 'exact' }) // Get total count for pagination
            .order('name');
        
        // Apply brand filter if not platform admin
        if (!isPlatAdmin && accessibleMasterBrandIds.length > 0) {
            query = query.in('master_brand_id', accessibleMasterBrandIds);
        }
        
        // Filter by specific brand if requested
        const brandIdParam = req.nextUrl.searchParams.get('brand_id');
        if (brandIdParam) {
            // Verify user has access to this brand
            if (!isPlatAdmin && !accessibleMasterBrandIds.includes(brandIdParam)) {
                return NextResponse.json(
                    { success: false, error: 'Access denied to this brand' },
                    { status: 403 }
                );
            }
            query = query.eq('master_brand_id', brandIdParam);
        }
        
        // Add search filter if provided
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        // Apply pagination
        query = query.range(offset, offset + validatedLimit - 1);
        
        const { data, error, count } = await query;

        if (error) {
            console.error('[API Products GET] Error fetching products:', error);
            return handleApiError(error, 'Failed to fetch products');
        }
        
        const validatedData = Array.isArray(data) ? data.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            master_brand_id: item.master_brand_id || '', // Handle nullable master_brand_id
            created_at: item.created_at,
            updated_at: item.updated_at
        })).filter(item => item.master_brand_id !== '') : []; // Filter out products without master_brand_id

        // Calculate pagination metadata
        const totalPages = count ? Math.ceil(count / validatedLimit) : 0;
        const hasNextPage = validatedPage < totalPages;
        const hasPreviousPage = validatedPage > 1;
        
        return NextResponse.json({ 
            success: true, 
            data: validatedData as Product[],
            pagination: {
                page: validatedPage,
                limit: validatedLimit,
                total: count || 0,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }
        });

    } catch (error: unknown) {
        console.error('[API Products GET] Catched error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching products.');
    }
});

// POST handler for creating a new product
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { name, description, master_brand_id } = body; // Renamed global_brand_id

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Product name is required and must be a non-empty string.' },
                { status: 400 }
            );
        }
        if (!master_brand_id || typeof master_brand_id !== 'string') { // Renamed
            return NextResponse.json(
                { success: false, error: 'Master Brand ID is required.' }, // Renamed
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
        let hasPermission = user?.user_metadata?.role === 'admin';

        if (!hasPermission && master_brand_id) { // Renamed
            const { data: mcbData, error: mcbError } = await supabase // Renamed gcbData to mcbData
                .from('master_claim_brands') // Renamed table
                .select('mixerai_brand_id')
                .eq('id', master_brand_id) // Renamed
                .single();

            if (mcbError || !mcbData || !mcbData.mixerai_brand_id) {
                console.error(`[API Products POST] Error fetching MCB or MCB not linked for permissions (MCB ID: ${master_brand_id}):`, mcbError);
                // Deny if MCB not found or not linked to a core MixerAI brand
            } else {
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_brand_permissions')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('brand_id', mcbData.mixerai_brand_id)
                    .eq('role', 'admin') // Must be an admin of the core MixerAI brand
                    .limit(1);

                if (permissionsError) {
                    console.error(`[API Products POST] Error fetching user_brand_permissions:`, permissionsError);
                } else if (permissionsData && permissionsData.length > 0) {
                    hasPermission = true;
                }
            }
        } else if (!master_brand_id && !hasPermission) { // Renamed
             // This case should ideally be caught by required field validation for master_brand_id earlier.
             // If master_brand_id is missing and user is not admin, deny.
        }

        if (!hasPermission) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create a product for this brand.' },
                { status: 403 }
            );
        }
        // --- Permission Check End ---
        
        const newRecord: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
            name: name.trim(),
            description: description?.trim() || null,
            master_brand_id: master_brand_id // Renamed
        };

        const { data, error } = await supabase.from('products')
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error('[API Products POST] Error creating product:', error);
            interface PostgresError extends Error {
                code?: string;
            }
            if ((error as PostgresError).code === '23505') { // Unique violation for (master_brand_id, name)
                 return NextResponse.json(
                    { success: false, error: 'A product with this name already exists for this brand.' },
                    { status: 409 } // Conflict
                );
            }
            if ((error as PostgresError).code === '23503') { // Foreign key violation for master_brand_id
                return NextResponse.json(
                   { success: false, error: 'Invalid Master Brand ID. The specified brand does not exist.' }, // Renamed
                   { status: 400 } // Bad request
               );
           }
            return handleApiError(error, 'Failed to create product.');
        }

        const singleDataObject = data as Product;
        const validatedData: Product = {
            id: singleDataObject.id,
            name: singleDataObject.name,
            description: singleDataObject.description,
            master_brand_id: singleDataObject.master_brand_id, // Renamed
            created_at: singleDataObject.created_at,
            updated_at: singleDataObject.updated_at
        };

        return NextResponse.json({ success: true, data: validatedData }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API Products POST] Catched error:', error);
        if (error instanceof Error && error.name === 'SyntaxError') { // JSON parsing error
            return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
        }
        return handleApiError(error, 'An unexpected error occurred while creating the product.');
    }
}); 