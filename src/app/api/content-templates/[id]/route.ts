import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * GET: Fetch a specific content template by ID
 */
export const GET = withAuth(async (request: NextRequest, user, context) => {
  try {
    const { params } = context || {};
    const id = params?.id;
    
    if (!id) {
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
    
    if (error) throw error;
    
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
export const PUT = withAuth(async (request: NextRequest, user, context) => {
  try {
    const { params } = context || {};
    const id = params?.id;
    const data = await request.json();
    
    if (!id) {
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
export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  try {
    const { params } = context || {};
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Check if template is in use
    const { data: contentCount, error: countError } = await supabase
      .from('content')
      .select('id', { count: 'exact' })
      .eq('template_id', id);
    
    if (countError) throw countError;
    
    // Prevent deletion if template is in use
    if (contentCount && contentCount.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete template that is in use by content items',
          count: contentCount.length
        },
        { status: 400 }
      );
    }
    
    // Delete the template
    const { error } = await supabase
      .from('content_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content template:', error);
    return handleApiError(error, 'Failed to delete content template');
  }
}); 