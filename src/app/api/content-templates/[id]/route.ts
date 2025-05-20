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
    // Role check: Only Global Admins can access content templates
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access this resource.' },
        { status: 403 }
      );
    }

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
    // Role check: Only Global Admins can update content templates
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update this resource.' },
        { status: 403 }
      );
    }

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
    
    // --- AI Description Generation for Template Update ---
    let generatedDescription = data.description || ''; // Use provided desc or generate
    // Regenerate if name or fields structure changes
    const shouldRegenerateDescription = data.name !== undefined || data.fields !== undefined;

    if (shouldRegenerateDescription) {
      try {
        const inputFieldNames = (data.fields.inputFields || []).map((f: any) => f.name).filter(Boolean);
        const outputFieldNames = (data.fields.outputFields || []).map((f: any) => f.name).filter(Boolean);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const aiDescriptionResponse = await fetch(`${baseUrl}/api/ai/generate-template-description`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: data.name,
            inputFields: inputFieldNames,
            outputFields: outputFieldNames,
          }),
        });

        if (aiDescriptionResponse.ok) {
          const aiData = await aiDescriptionResponse.json();
          if (aiData.success && aiData.description) {
            generatedDescription = aiData.description;
          }
        } else {
          console.warn('Failed to generate AI description for template update.');
        }
      } catch (aiError) {
        console.warn('Error calling AI template description generation service on update:', aiError);
      }
    }
    // --- End AI Description Generation ---

    // Update the template
    const { data: updatedTemplate, error } = await supabase
      .from('content_templates')
      .update({
        name: data.name,
        description: generatedDescription, // Use AI generated or existing
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
 * DELETE: Remove a content template atomically using an RPC.
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any,
  context: { params: { id: string } }
) => {
  try {
    // Role check: Only Global Admins can delete content templates
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this resource.' },
        { status: 403 }
      );
    }

    const templateIdToDelete = context.params.id;
    console.log('API Route - DELETE template - Template ID from params:', templateIdToDelete);
    
    if (!templateIdToDelete) {
      console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();

    // Call the database function to perform atomic delete and content update
    const { error: rpcError } = await supabase.rpc('delete_template_and_update_content', {
      template_id_to_delete: templateIdToDelete
    });

    if (rpcError) {
      console.error('Error calling delete_template_and_update_content RPC:', rpcError);
      // Check for specific PostgreSQL error codes if the function indicates template not found
      // This depends on how the function handles "not found" (e.g., raises an error or warning)
      // If it raises a specific error or a general one that we can identify:
      // if (rpcError.code === 'P0001' && rpcError.message.includes('Template not found')) { 
      //      return NextResponse.json({ success: false, error: 'Template not found or already deleted.' }, { status: 404 });
      // }
      throw rpcError; // Re-throw for generic handling by handleApiError
    }
    
    return NextResponse.json({
      success: true,
      message: 'Content template deleted successfully and associated content items have been updated.'
    });

  } catch (error) {
    console.error('Error deleting content template:', error);
    // Ensure the error response structure is consistent if handleApiError is not already doing so
    const apiError = handleApiError(error, 'Failed to delete content template');
    // Check if apiError is already a NextResponse, if so return it, otherwise wrap it.
    // This depends on the implementation of handleApiError. For now, assume it returns a valid response.
    return apiError;
  }
}); 