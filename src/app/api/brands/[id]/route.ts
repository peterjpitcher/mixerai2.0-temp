import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { isBrandAdmin } from '@/lib/auth/api-auth';
import { getUserAuthByEmail, inviteNewUserWithAppMetadata } from '@/lib/auth/user-management';
import { User } from '@supabase/supabase-js'; // Ensure User type is available
import { extractCleanDomain } from '@/lib/utils/url-utils'; // Added import

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Type for priority as it comes from Supabase (enum string values)
// Define these types and helper here as well for this route file
type SupabaseVettingAgencyPriority = "High" | "Medium" | "Low" | null;

// Helper function to map Supabase priority strings to numbers
function mapSupabasePriorityToNumber(priority: SupabaseVettingAgencyPriority): number {
  switch (priority) {
    case "High": return 1;
    case "Medium": return 2;
    case "Low": return 3;
    default: return Number.MAX_SAFE_INTEGER; // Default for null or unexpected values
  }
}

// Interface for vetting agency with numeric priority (for API response)
interface VettingAgencyForResponse {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number; // Numeric priority
  // Add other fields if the original SupabaseVettingAgency had more that are needed.
}

// GET a single brand by ID
export const GET = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
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

    const { data: brandDataResult, error: brandFetchError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();
    
    if (brandFetchError) {
        throw brandFetchError;
    }
    
    const brandData: any = brandDataResult; // Cast to any to bypass strict typing for now

    if (!brandData) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        }
      );
    }

    let masterClaimBrandName: string | null = null;
    if (brandData.master_claim_brand_id) {
      const { data: masterClaimBrandData, error: mcbError } = await supabase
        .from('master_claim_brands')
        .select('name')
        .eq('id', brandData.master_claim_brand_id)
        .single();

      if (mcbError) {
        console.warn(`[API Brands GET /${brandId}] Error fetching master_claim_brand name for ID ${brandData.master_claim_brand_id}:`, mcbError.message);
        // Do not fail the request, just proceed without the name
      } else if (masterClaimBrandData) {
        masterClaimBrandName = masterClaimBrandData.name;
      }
    }

    const { data: selectedAgenciesData, error: selectedAgenciesError } = await supabase
      .from('brand_selected_agencies')
      .select(`
        agency_id,
        content_vetting_agencies (
          id,
          name,
          description,
          country_code,
          priority
        )
      `)
      .eq('brand_id', brandId);

    if (selectedAgenciesError) {
      console.error('Error fetching selected agencies with Supabase:', selectedAgenciesError);
      throw selectedAgenciesError;
    }

    let processedAgencies: VettingAgencyForResponse[] = [];
    if (selectedAgenciesData) {
      processedAgencies = selectedAgenciesData
        .map(item => {
            const agencyFromDb = item.content_vetting_agencies;
            if (agencyFromDb) {
                return {
                    id: agencyFromDb.id,
                    name: agencyFromDb.name,
                    description: agencyFromDb.description,
                    country_code: agencyFromDb.country_code,
                    priority: mapSupabasePriorityToNumber(agencyFromDb.priority as SupabaseVettingAgencyPriority),
                    // Include other fields from agencyFromDb if they were part of its original type
                    // and are expected in VettingAgencyForResponse
                } as VettingAgencyForResponse;
            }
            return null;
        })
        .filter((agency): agency is VettingAgencyForResponse => agency !== null) // Filter out nulls and type guard
        .sort((a, b) => { // Sort by numeric priority then name
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return (a.name || '').localeCompare(b.name || '');
        });
    }
    
    const brand: any = brandData;
    brand.selected_vetting_agencies = processedAgencies; // Assign agencies with numeric priority

    // Fetch Brand Admins
    const { data: adminPermissions, error: adminPermissionsError } = await supabase
      .from('user_brand_permissions')
      .select('user_id, profiles (id, full_name, email, avatar_url, job_title)')
      .eq('brand_id', brandId)
      .eq('role', 'admin');

    if (adminPermissionsError) {
      console.error('Error fetching brand admins:', adminPermissionsError);
      throw adminPermissionsError;
    }

    const adminUsers = adminPermissions?.map(p => p.profiles).filter(profile => profile !== null) || [];
    brand.admins = adminUsers; // Add admins to the brand object
    if (masterClaimBrandName) {
      brand.master_claim_brand_name = masterClaimBrandName;
    }

    const { count: contentCount, error: contentCountError } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId);
      
    if (contentCountError) throw contentCountError; 
    
    const { count: workflowCount, error: workflowCountError } = await supabase
      .from('workflows')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId);
      
    if (workflowCountError) throw workflowCountError;

    return NextResponse.json({ 
      success: true, 
      brand, // brand now contains selected_vetting_agencies with numeric priorities
      contentCount: contentCount || 0,
      workflowCount: workflowCount || 0,
      meta: {
        source: 'database (Supabase)',
        isFallback: false,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'x-data-source': 'database (Supabase)'
      }
    });
  } catch (error: any) {
    return handleApiError(error, 'Error fetching brand');
  }
});

// PUT endpoint to update a brand
export const PUT = withAuth(async (
  request: NextRequest,
  authenticatedUser: any, 
  context: { params: { id: string } }
) => {
  const supabase = createSupabaseAdminClient();
  try {
    const brandIdToUpdate = context.params.id;

    const isGlobalAdmin = authenticatedUser.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      const hasBrandAdminPermission = await isBrandAdmin(authenticatedUser.id, brandIdToUpdate, supabase);
      if (!hasBrandAdminPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not have admin rights for this brand.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Prepare parameters for the RPC call
    const rpcParams = {
      p_brand_id_to_update: brandIdToUpdate,
      p_name: body.name,
      p_website_url: body.website_url || null,
      // Ensure additional_website_urls is an array of strings
      p_additional_website_urls: Array.isArray(body.additional_website_urls) 
        ? body.additional_website_urls.filter((url: any) => typeof url === 'string') 
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
        ? body.selected_agency_ids.filter((id: any) => typeof id === 'string') 
        : [],
      // Ensure new_custom_agency_names is an array of strings
      p_new_custom_agency_names: Array.isArray(body.new_custom_agency_names) 
        ? body.new_custom_agency_names.filter((name: any) => typeof name === 'string') 
        : [],
      p_user_id: authenticatedUser.id // Pass the authenticated user's ID
    };

    const { data: updatedBrandData, error: rpcError } = await supabase.rpc(
      'update_brand_with_agencies' as any, // Cast to any to bypass TS error for new RPC
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
          } catch (e) { /* Fall through to generic error */ }
      }
      return handleApiError(rpcError, 'Failed to update brand via RPC.');
    }

    // The RPC function is designed to return a JSON object representing the updated brand
    // or an object like { success: false, error: 'message' } if it failed internally
    if (updatedBrandData && typeof updatedBrandData === 'object' && (updatedBrandData as any).error) {
        // Error explicitly returned from the RPC function's EXCEPTION block
        console.error(`[API Brands PUT /${brandIdToUpdate}] Error from RPC function:`, (updatedBrandData as any).error);
        return NextResponse.json(
          { success: false, error: (updatedBrandData as any).error },
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
      brand: updatedBrandData, // This should be the JSON object returned by the RPC
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

  } catch (error: any) {
    console.error(`[API Brands PUT /${context.params.id}] General error:`, error);
    return handleApiError(error, 'Error updating brand');
  }
});

// DELETE a brand by ID (logic remains largely unchanged as it was already Supabase-centric)
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const brandIdToDelete = context.params.id;
    
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
      (detailedError as any).cause = rpcError;
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