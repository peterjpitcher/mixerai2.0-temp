import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { isBrandAdmin } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET a single brand by ID
export const GET = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    const { data: brand, error: brandFetchError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();
    
    if (brandFetchError) {
        throw brandFetchError;
    }
    
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        }
      );
    }

    const { count: contentCount, error: contentCountError } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
      
    if (contentCountError) throw contentCountError; 
    
    const { count: workflowCount, error: workflowCountError } = await supabase
      .from('workflows')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
      
    if (workflowCountError) throw workflowCountError;

    return NextResponse.json({ 
      success: true, 
      brand,
      contentCount: contentCount || 0,
      workflowCount: workflowCount || 0,
      meta: {
        source: 'database',
        isFallback: false,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'x-data-source': 'database'
      }
    });
  } catch (error: any) {
    return handleApiError(error, 'Error fetching brand');
  }
});

// PUT endpoint to update a brand
export const PUT = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const brandIdToUpdate = context.params.id;
    
    // Authorize: Check if the authenticated user is an admin for this specific brand
    const hasPermission = await isBrandAdmin(user.id, brandIdToUpdate, supabase);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have admin rights for this brand.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.website_url !== undefined) updateData.website_url = body.website_url;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.brand_identity !== undefined) updateData.brand_identity = body.brand_identity;
    if (body.tone_of_voice !== undefined) updateData.tone_of_voice = body.tone_of_voice;
    if (body.brand_color !== undefined) updateData.brand_color = body.brand_color;
    if (body.approved_content_types !== undefined) updateData.approved_content_types = body.approved_content_types;
    
    if (body.brand_summary !== undefined) {
      updateData.brand_summary = body.brand_summary;
    } else if (body.brand_identity !== undefined && (body.brand_identity !== "")) {
      updateData.brand_summary = body.brand_identity.slice(0, 250);
      if (body.brand_identity.length > 250) {
        updateData.brand_summary += '...';
      }
    }
    
    if (body.guardrails !== undefined) {
      let formattedGuardrails = body.guardrails;
      if (Array.isArray(body.guardrails)) {
        formattedGuardrails = body.guardrails.map((item:string) => `- ${item}`).join('\n');
      } 
      else if (typeof body.guardrails === 'string' && 
               body.guardrails.trim().startsWith('[') && 
               body.guardrails.trim().endsWith(']')) {
        try {
          const guardrailsArray = JSON.parse(body.guardrails);
          if (Array.isArray(guardrailsArray)) {
            formattedGuardrails = guardrailsArray.map((item:string) => `- ${item}`).join('\n');
          }
        } catch (e) {
          // console.log removed
        }
      }
      updateData.guardrails = formattedGuardrails;
    }
    
    if (body.content_vetting_agencies !== undefined) updateData.content_vetting_agencies = body.content_vetting_agencies;
    
    if (body.brand_admin_id) {
      const newBrandAdminId = body.brand_admin_id;
      const { data: existingPermission, error: permCheckError } = await supabase
        .from('user_brand_permissions')
        .select('id, role')
        .eq('user_id', newBrandAdminId)
        .eq('brand_id', brandIdToUpdate)
        .maybeSingle();
      
      if (permCheckError) {
        throw permCheckError;
      } 
      if (existingPermission && existingPermission.role !== 'admin') {
        const { error: updatePermError } = await supabase
          .from('user_brand_permissions')
          .update({ role: 'admin' })
          .eq('id', existingPermission.id);
        if (updatePermError) throw updatePermError;
      } else if (!existingPermission) {
        const { error: createPermError } = await supabase
          .from('user_brand_permissions')
          .insert({ user_id: newBrandAdminId, brand_id: brandIdToUpdate, role: 'admin' });
        if (createPermError) throw createPermError;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data: updatedBrandData, error: updateErrorData } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', brandIdToUpdate)
      .select()
      .single();
    
    if (updateErrorData) throw updateErrorData;
    
    if (!updatedBrandData) {
      return NextResponse.json(
        { success: false, error: 'Brand not found or no changes made' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      brand: updatedBrandData 
    });
  } catch (error) {
    return handleApiError(error, 'Error updating brand');
  }
});

// DELETE a brand by ID
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const brandIdToDelete = context.params.id;
    
    // Authorize: Check if the authenticated user is an admin for this specific brand
    const hasPermission = await isBrandAdmin(user.id, brandIdToDelete, supabase);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have admin rights for this brand to delete it.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const deleteCascade = url.searchParams.get('deleteCascade') === 'true';
    
    // Check if brand exists before attempting to fetch dependents or delete
    const { data: brandToCheck, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandIdToDelete)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Fetched template not found"
        // An actual error occurred, not just not found
        throw fetchError;
    }
    if (!brandToCheck) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    // If not cascading, check for dependents first
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
          { status: 400 } // Bad Request or 409 Conflict could also be used
        );
      }
    }
    
    // Call the database function to perform atomic delete
    // This function (delete_brand_and_dependents) needs to be created in your PostgreSQL database.
    // It should handle deleting related user_brand_permissions, workflows, and then the brand.
    // Content associated with the brand should be handled by ON DELETE CASCADE on content.brand_id.
    // Workflows associated with the brand will set content.workflow_id to NULL (ON DELETE SET NULL).
    const { error: rpcError } = await supabase.rpc('delete_brand_and_dependents', {
      brand_id_to_delete: brandIdToDelete
    });

    if (rpcError) {
      console.error('Error calling delete_brand_and_dependents RPC:', rpcError);
      // Check for specific PostgreSQL error codes if the function indicates brand not found after attempting delete
      if (rpcError.code === 'P0001' && rpcError.message.includes('Brand not found')) { // Example custom error from function
           return NextResponse.json({ success: false, error: 'Brand not found or already deleted.' }, { status: 404 });
      }
      throw rpcError; // Re-throw for generic handling by handleApiError
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Brand "${brandToCheck.name}" and its direct dependents (permissions, workflows) have been scheduled for deletion. Content will be cascade deleted.` 
    });

  } catch (error) {
    return handleApiError(error, 'Error deleting brand');
  }
}); 