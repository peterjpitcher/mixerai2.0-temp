import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { isBrandAdmin } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { validateRequest } from '@/lib/api/validation';
import { updateBrandSchema, type UpdateBrandSchema } from '../update-brand-schema';
import { formatGuardrailsInput } from '../create-brand-schema';

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
      .rpc('get_brand_details_by_id' as never, { p_brand_id: brandId } as never)
      .single();

    if (rpcError) {
      console.error(`[API Brands GET /${brandId}] RPC Error:`, rpcError);
      throw rpcError;
    }

    // Brand details fetched successfully from RPC

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

// Core PUT handler logic
const putHandlerCore = async (
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

    const validation = await validateRequest(request, updateBrandSchema);
    if (!validation.success) {
      return validation.response;
    }

    const body = validation.data as UpdateBrandSchema;
    const trimmedName = body.name?.trim() ?? '';
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }

    const formattedGuardrails = formatGuardrailsInput(body.guardrails);
    const normalizedCountry = body.country?.trim() || null;
    const normalizedLanguage = body.language?.trim() || null;

    const uniqueAdditionalUrls = Array.isArray(body.additional_website_urls)
      ? Array.from(new Set(body.additional_website_urls))
      : null;
    const normalizedAdditionalUrls =
      uniqueAdditionalUrls && uniqueAdditionalUrls.length > 0 ? uniqueAdditionalUrls : null;

    const selectedAgencyIds = Array.from(
      new Set(Array.isArray(body.selected_agency_ids) ? body.selected_agency_ids : []),
    );
    const newCustomAgencyNames = Array.isArray(body.new_custom_agency_names)
      ? body.new_custom_agency_names
      : [];
    const masterClaimBrandIds = Array.isArray(body.master_claim_brand_ids)
      ? Array.from(new Set(body.master_claim_brand_ids))
      : [];
    
    // Update brand directly without RPC
    const brandUpdateData: Record<string, unknown> = {
      name: trimmedName,
      website_url: body.website_url || null,
      additional_website_urls: normalizedAdditionalUrls,
      country: normalizedCountry,
      language: normalizedLanguage,
      brand_identity: body.brand_identity || null,
      tone_of_voice: body.tone_of_voice || null,
      guardrails: formattedGuardrails,
      brand_color: body.brand_color || '#1982C4',
      master_claim_brand_id: body.master_claim_brand_id || null,
      logo_url: body.logo_url || null,
      updated_at: new Date().toISOString()
    };
    
    // Update brand directly without RPC
    const { data: updatedBrandData, error: updateError } = await supabase
      .from('brands')
      .update(brandUpdateData)
      .eq('id', brandIdToUpdate)
      .select()
      .single();

    if (updateError) {
      console.error(`[API Brands PUT /${brandIdToUpdate}] Update Error:`, updateError);
      return handleApiError(updateError, 'Failed to update brand.');
    }

    if (!updatedBrandData) {
      return NextResponse.json(
        { success: false, error: 'Failed to update brand. No data returned.' },
        { status: 500 }
      );
    }

    // Handle vetting agencies if provided
    if (body.selected_agency_ids !== undefined || body.new_custom_agency_names !== undefined) {
      // First, delete existing associations
      const { error: deleteAgenciesError } = await supabase
        .from('brand_selected_agencies')
        .delete()
        .eq('brand_id', brandIdToUpdate);

      if (deleteAgenciesError) {
        console.error(`[API Brands PUT /${brandIdToUpdate}] Error deleting existing vetting agencies:`, deleteAgenciesError);
      }

      // Insert new agency associations if provided
      if (selectedAgencyIds.length > 0) {
        const agencyAssociations = selectedAgencyIds.map((agencyId) => ({
          brand_id: brandIdToUpdate,
          agency_id: agencyId
        }));

        const { error: insertAgenciesError } = await supabase
          .from('brand_selected_agencies')
          .insert(agencyAssociations);

        if (insertAgenciesError) {
          console.error(`[API Brands PUT /${brandIdToUpdate}] Error inserting vetting agencies:`, insertAgenciesError);
        }
      }

      // Handle custom agencies if provided  
      if (newCustomAgencyNames.length > 0) {
        for (const agencyName of newCustomAgencyNames) {
          if (typeof agencyName === 'string' && agencyName.trim()) {
            if (!normalizedCountry) {
              console.warn('[API Brands PUT] Skipping custom agency setup due to missing country context.', {
                brandId: brandIdToUpdate,
                agencyName,
              });
              continue;
            }

            // Check if agency already exists
            let existingAgencyQuery = supabase
              .from('content_vetting_agencies')
              .select('id')
              .eq('name', agencyName.trim());

            if (normalizedCountry) {
              existingAgencyQuery = existingAgencyQuery.eq('country_code', normalizedCountry);
            }

            const { data: existingAgency } = await existingAgencyQuery.single();

            let agencyId: string;
            if (existingAgency) {
              agencyId = existingAgency.id;
            } else {
              // Create new agency
              const newAgencyPayload = {
                name: agencyName.trim(),
                country_code: normalizedCountry,
                created_by: authenticatedUser.id,
              };

              const { data: newAgency, error: createAgencyError } = await supabase
                .from('content_vetting_agencies')
                .insert(newAgencyPayload)
                .select('id')
                .single();

              if (createAgencyError || !newAgency) {
                console.error(`[API Brands PUT /${brandIdToUpdate}] Error creating custom agency:`, createAgencyError);
                continue;
              }
              agencyId = newAgency.id;
            }

            // Associate with brand
            const { error: associateError } = await supabase
              .from('brand_selected_agencies')
              .insert({
                brand_id: brandIdToUpdate,
                agency_id: agencyId
              });

            if (associateError) {
              console.error(`[API Brands PUT /${brandIdToUpdate}] Error associating custom agency:`, associateError);
            }
          }
        }
      }
    }

    // Handle master_claim_brand_ids array if provided using the new junction table
    if (Array.isArray(body.master_claim_brand_ids)) {
      // First, delete all existing links for this brand
      const { error: deleteError } = await supabase
        .from('brand_master_claim_brands')
        .delete()
        .eq('brand_id', brandIdToUpdate);
      
      if (deleteError) {
        console.error(`[API Brands PUT /${brandIdToUpdate}] Error deleting existing master claim brand links:`, deleteError);
      }
      
      // Then, insert new links
      if (masterClaimBrandIds.length > 0) {
        const newLinks = masterClaimBrandIds.map((masterClaimBrandId) => ({
          brand_id: brandIdToUpdate,
          master_claim_brand_id: masterClaimBrandId,
          created_by: authenticatedUser.id
        }));
        
        const { error: insertError } = await supabase
          .from('brand_master_claim_brands')
          .insert(newLinks);
        
        if (insertError) {
          console.error(`[API Brands PUT /${brandIdToUpdate}] Error inserting master claim brand links:`, insertError);
          return NextResponse.json(
            { success: false, error: 'Failed to update master claim brand associations.' },
            { status: 500 }
          );
        }
      }
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
};

// PUT endpoint to update a brand
export const PUT = withAuthAndCSRF(putHandlerCore);

// DELETE a brand by ID (logic remains largely unchanged as it was already Supabase-centric)
export const DELETE = withAuthAndCSRF(async (
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

// Temporary POST handler that delegates to PUT for CloudFlare WAF workaround
export const POST = withAuthAndCSRF(async (request, user, context) => {
  const url = new URL(request.url);
  
  // Check if this is a method override request
  if (url.searchParams.get('_method') === 'PUT') {
    // Call the PUT handler logic directly
    return putHandlerCore(request, user, context);
  }
  
  // If not a method override, return method not allowed
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed',
      message: 'POST is not supported for this endpoint'
    },
    { status: 405 }
  );
});
