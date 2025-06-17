import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { isBrandAdmin } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";


interface BrandDetailsFromRPC {
  id: string;
  name: string;
  // Add all other fields returned by the RPC
  contentCount: number;
  workflowCount: number;
  [key: string]: unknown; // Allow other properties
}

// GET a single brand by ID
export const GET = withAuth(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const { id: brandId } = params;

    // Role and Permission Check
    const isGlobalAdmin = user.user_metadata?.role === 'admin';

    if (!isGlobalAdmin) {
      // If not a global admin, check if the user has any permission for this specific brand
      const { data: permission, error: permError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', user.id)
        .eq('brand_id', brandId)
        .maybeSingle(); // Use maybeSingle as we only need to know if at least one exists

      if (permError) {
        console.error(`[API Brands GET /${brandId}] Error checking brand permissions for user ${user.id}:`, permError);
        return handleApiError(permError, 'Error checking brand permissions');
      }

      if (!permission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not have permission to access this brand.' },
          { status: 403 }
        );
      }
    }
    // If global admin or has specific permission, proceed to fetch brand details

    const { data: brandDetails, error: rpcError } = await supabase
      .rpc('get_brand_details_by_id', { p_brand_id: brandId })
      .single();

    if (rpcError) {
      console.error(`[API Brands GET /${brandId}] RPC Error:`, rpcError);
      throw rpcError;
    }

    console.log('[API Brands GET] Brand details from RPC:', brandDetails);
    console.log('[API Brands GET] Logo URL from RPC:', (brandDetails as Record<string, unknown>)?.logo_url);

    if (!brandDetails) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        }
      );
    }
    
    // The RPC returns a single JSON object with all the data we need.
    const brand = brandDetails as BrandDetailsFromRPC;
    const contentCount = brand.contentCount || 0;
    const workflowCount = brand.workflowCount || 0;

    return NextResponse.json({ 
      success: true, 
      brand,
      contentCount,
      workflowCount,
      meta: {
        source: 'database (Supabase RPC)',
        isFallback: false,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'x-data-source': 'database (Supabase RPC)'
      }
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Error fetching brand');
  }
});

// PUT endpoint to update a brand
export const PUT = withAuth(async (
  request: NextRequest,
  authenticatedUser: User, 
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  const brandIdToUpdate = params.id;
  const supabase = createSupabaseAdminClient();
  try {

    const isGlobalAdmin = authenticatedUser.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasBrandAdminPermission = await isBrandAdmin(authenticatedUser.id, brandIdToUpdate, supabase as any);
      if (!hasBrandAdminPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not have admin rights for this brand.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    console.log(`[API PUT /brands/${brandIdToUpdate}] Received body:`, body);
    console.log(`[API PUT /brands/${brandIdToUpdate}] Logo URL:`, body.logo_url);
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Note: logo_url will be handled by the RPC function
    
    // Prepare parameters for the RPC call
    const rpcParams = {
      p_brand_id_to_update: brandIdToUpdate,
      p_name: body.name,
      p_website_url: body.website_url || null,
      // Ensure additional_website_urls is an array of strings
      p_additional_website_urls: Array.isArray(body.additional_website_urls) 
        ? body.additional_website_urls.filter((url: unknown) => typeof url === 'string') 
        : [],
      p_country: body.country || null,
      p_language: body.language || null,
      p_brand_identity: body.brand_identity || null,
      p_tone_of_voice: body.tone_of_voice || null,
      p_guardrails: body.guardrails || null,
      p_brand_color: body.brand_color || '#1982C4',
      p_master_claim_brand_id: body.master_claim_brand_id === "@none@" || body.master_claim_brand_id === "" ? null : body.master_claim_brand_id,
      // Ensure selected_agency_ids is an array of strings (UUIDs)
      p_selected_agency_ids: Array.isArray(body.selected_agency_ids) 
        ? body.selected_agency_ids.filter((id: unknown) => typeof id === 'string') 
        : [],
      // Ensure new_custom_agency_names is an array of strings
      p_new_custom_agency_names: Array.isArray(body.new_custom_agency_names) 
        ? body.new_custom_agency_names.filter((name: unknown) => typeof name === 'string') 
        : [],
      p_user_id: authenticatedUser.id, // Pass the authenticated user's ID
      p_logo_url: body.logo_url || null // Pass logo_url to RPC function
    };

    console.log('[API Brands PUT] RPC params:', rpcParams);
    console.log('[API Brands PUT] Logo URL in RPC params:', rpcParams.p_logo_url);

    const { data: updatedBrandData, error: rpcError } = await supabase.rpc(
      'update_brand_with_agencies',
      rpcParams
    );

    if (rpcError) {
      console.error(`[API Brands PUT /${brandIdToUpdate}] RPC Error:`, rpcError);
      // Check if the error from RPC is already a JSON object with an 'error' field
      if (rpcError.message && rpcError.message.includes('"{')) { // Simple check for JSON string
          try {
              const parsedError = JSON.parse(rpcError.message.substring(rpcError.message.indexOf('"{')));
              if(parsedError.error) {
                return handleApiError({ message: parsedError.error, details: rpcError }, 'Failed to update brand via RPC.');
              }
          } catch { /* Fall through to generic error */ }
      }
      return handleApiError(rpcError, 'Failed to update brand via RPC.');
    }

    // The RPC function is designed to return a JSON object representing the updated brand
    // or an object like { success: false, error: 'message' } if it failed internally
    if (updatedBrandData && typeof updatedBrandData === 'object' && (updatedBrandData as { error?: string }).error) {
        // Error explicitly returned from the RPC function's EXCEPTION block
        console.error(`[API Brands PUT /${brandIdToUpdate}] Error from RPC function:`, (updatedBrandData as { error?: string }).error);
        return NextResponse.json(
          { success: false, error: (updatedBrandData as { error?: string }).error },
          { status: 500 }
        );
    }
    
    // If RPC was successful and returned brand data
    if (!updatedBrandData) {
        console.error(`[API Brands PUT /${brandIdToUpdate}] RPC returned no data.`);
        return NextResponse.json(
          { success: false, error: 'Failed to update brand: No data returned from operation.' },
          { status: 500 }
        );
    }

    return NextResponse.json({
      success: true,
      data: updatedBrandData, // Using 'data' for consistency with POST endpoint
      message: 'Brand updated successfully.',
      meta: {
        source: 'database (Supabase RPC)',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'x-data-source': 'database (Supabase RPC)'
      }
    });

  } catch (error: unknown) {
    console.error(`[API Brands PUT /${brandIdToUpdate}] General error:`, error);
    return handleApiError(error, 'Error updating brand');
  }
});

// DELETE a brand by ID (logic remains largely unchanged as it was already Supabase-centric)
export const DELETE = withAuth(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseAdminClient();
    const brandIdToDelete = params.id;
    
    // Role check: Only Global Admins can delete brands
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this resource.' },
        { status: 403 }
      );
    }
    // If we reach here, user is a Global Admin

    const url = new URL(request.url);
    const deleteCascade = url.searchParams.get('deleteCascade') === 'true';
    
    const { data: brandToCheck, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandIdToDelete)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') { 
        throw fetchError;
    }
    if (!brandToCheck) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    if (!deleteCascade) {
      const { count: contentCount, error: contentCountErr } = await supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandIdToDelete);
      if (contentCountErr) throw contentCountErr;
      
      const { count: workflowCount, error: workflowCountErr } = await supabase
        .from('workflows')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandIdToDelete);
      if (workflowCountErr) throw workflowCountErr;
      
      const contentCountValue = contentCount || 0;
      const workflowCountValue = workflowCount || 0;
      
      if (contentCountValue > 0 || workflowCountValue > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot delete brand. It has ${contentCountValue} piece${contentCountValue === 1 ? '' : 's'} of content and ${workflowCountValue} workflow${workflowCountValue === 1 ? '' : 's'} associated. Use deleteCascade=true to override.`,
            contentCount: contentCountValue,
            workflowCount: workflowCountValue,
            requiresCascade: true
          },
          { status: 400 } 
        );
      }
    }
    
    // Optional: Before deleting the brand, you might want to remove associated user permissions
    // to avoid orphaned records if ON DELETE CASCADE is not set up for user_brand_permissions
    // This depends on your database schema and desired cleanup behavior.
    // Example: remove all permissions for this brand
    const { error: deletePermissionsError } = await supabase
      .from('user_brand_permissions')
      .delete()
      .eq('brand_id', brandIdToDelete);

    if (deletePermissionsError) {
      console.warn(`[API Brands DELETE /${brandIdToDelete}] Failed to delete user permissions for brand. Proceeding with brand deletion. Error:`, deletePermissionsError.message);
      // Not treating this as a fatal error for brand deletion itself, but logging it.
    }

    const { error: rpcError } = await supabase.rpc('delete_brand_and_dependents', {
      brand_id_to_delete: brandIdToDelete
    });

    if (rpcError) {
      console.error('Error calling delete_brand_and_dependents RPC:', rpcError);
      if (rpcError.code === 'P0001' && rpcError.message.includes('Brand not found')) { 
           return NextResponse.json({ success: false, error: 'Brand not found or already deleted.' }, { status: 404 });
      }
      const detailedError = new Error(`RPC Error: ${rpcError.message} (Code: ${rpcError.code}) Details: ${rpcError.details} Hint: ${rpcError.hint}`);
      (detailedError as { cause?: unknown }).cause = rpcError;
      throw detailedError;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Brand "${brandToCheck.name}" and its direct dependents have been scheduled for deletion.` 
    });

  } catch (error) {
    console.error('Full error in DELETE /api/brands/[id]:', error);
    return handleApiError(error, 'Error deleting brand');
  }
}); 