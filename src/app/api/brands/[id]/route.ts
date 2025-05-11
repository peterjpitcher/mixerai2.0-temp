import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

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
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
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
      const brandAdminId = body.brand_admin_id;
      const { data: existingPermission, error: permCheckError } = await supabase
        .from('user_brand_permissions')
        .select('id, role')
        .eq('user_id', brandAdminId)
        .eq('brand_id', id)
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
          .insert({ user_id: brandAdminId, brand_id: id, role: 'admin' });
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
      .eq('id', id)
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
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    const url = new URL(request.url);
    const deleteCascade = url.searchParams.get('deleteCascade') === 'true';
    
    const { data: brandToCheck, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!brandToCheck) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    const { count: contentCount, error: contentCountErr } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
    if (contentCountErr) throw contentCountErr;
    
    const { count: workflowCount, error: workflowCountErr } = await supabase
      .from('workflows')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
    if (workflowCountErr) throw workflowCountErr;
    
    const contentCountValue = contentCount || 0;
    const workflowCountValue = workflowCount || 0;
    
    if (!deleteCascade && (contentCountValue > 0 || workflowCountValue > 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete brand. It has ${contentCountValue} piece${contentCountValue === 1 ? '' : 's'} of content and ${workflowCountValue} workflow${workflowCountValue === 1 ? '' : 's'} associated with it.`,
          contentCount: contentCountValue,
          workflowCount: workflowCountValue,
          requiresCascade: true
        },
        { status: 400 }
      );
    }
    
    if (deleteCascade) {
      if (contentCountValue > 0) {
        const { error: cascadeContentDeleteError } = await supabase.from('content').delete().eq('brand_id', id);
        if (cascadeContentDeleteError) throw cascadeContentDeleteError;
      }
      if (workflowCountValue > 0) {
        const { error: cascadeWorkflowDeleteError } = await supabase.from('workflows').delete().eq('brand_id', id);
        if (cascadeWorkflowDeleteError) throw cascadeWorkflowDeleteError;
      }
      const { error: cascadeBrandDeleteError } = await supabase.from('brands').delete().eq('id', id);
      if (cascadeBrandDeleteError) throw cascadeBrandDeleteError;
      
      return NextResponse.json({ 
        success: true, 
        message: `Brand "${brandToCheck.name}" and all associated content and workflows have been deleted successfully` 
      });
    }
    
    const { error: finalBrandDeleteError } = await supabase.from('brands').delete().eq('id', id);
    if (finalBrandDeleteError) throw finalBrandDeleteError;
    
    return NextResponse.json({ 
      success: true, 
      message: `Brand "${brandToCheck.name}" has been deleted successfully` 
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting brand');
  }
}); 