import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * GET: Retrieve a specific content template by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    console.log('API Route - GET template - Context:', context);
    const id = context.params.id;
    console.log('API Route - Template ID from params:', id);
    
    if (!id) {
      console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Fetch the template
    const { data: template, error } = await supabase
      .from('content_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('API Route - Supabase error fetching template:', error);
      throw error;
    }
    
    console.log('API Route - Successfully fetched template:', template?.id);
    return NextResponse.json({ 
      success: true, 
      template 
    });
  } catch (error) {
    console.error('Error fetching content template:', error);
    return handleApiError(error, 'Failed to fetch content template');
  }
});

/**
 * PUT: Update a specific content template
 */
export const PUT = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    console.log('API Route - PUT template - Context:', context);
    const id = context.params.id;
    console.log('API Route - Template ID from params:', id);
    
    const data = await request.json();
    
    if (!id) {
      console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!data.name || !data.fields) {
      return NextResponse.json(
        { success: false, error: 'Name and fields are required' },
        { status: 400 }
      );
    }
    
    // Validate fields structure
    if (!data.fields.inputFields || !data.fields.outputFields) {
      return NextResponse.json(
        { success: false, error: 'Template must contain inputFields and outputFields' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Update the template
    const { data: updatedTemplate, error } = await supabase
      .from('content_templates')
      .update({
        name: data.name,
        description: data.description || '',
        icon: data.icon || null,
        fields: data.fields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      template: updatedTemplate[0]
    });
  } catch (error) {
    console.error('Error updating content template:', error);
    return handleApiError(error, 'Failed to update content template');
  }
});

/**
 * DELETE: Remove a content template
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    console.log('API Route - DELETE template - Context:', context);
    const id = context.params.id;
    console.log('API Route - Template ID from params:', id);
    
    if (!id) {
      console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Unassign template from content items and set their status to cancelled
    const { error: updateContentError } = await supabase
      .from('content')
      .update({ template_id: null, status: 'rejected' })
      .eq('template_id', id);

    if (updateContentError) {
      // Log the error but proceed to attempt template deletion
      // as the primary goal is to delete the template.
      // A more robust solution might involve transactions if the DB supports it here.
      console.error('Error updating content items before template deletion:', updateContentError);
      // Optionally, you could choose to return an error here if unassigning content is critical
      // return handleApiError(updateContentError, 'Failed to update associated content before deleting template');
    }
    
    // Delete the template
    const { error: deleteTemplateError } = await supabase
      .from('content_templates')
      .delete()
      .eq('id', id);
    
    if (deleteTemplateError) {
      // If the template itself couldn't be deleted, this is the primary error to report.
      throw deleteTemplateError;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully. Associated content items have been updated.'
    });
  } catch (error) {
    console.error('Error deleting content template:', error);
    return handleApiError(error, 'Failed to delete content template');
  }
}); 