import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * GET: Fetch all content templates
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If ID is provided, fetch a single template
    if (id) {
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        template: data 
      });
    }
    
    // Otherwise, fetch all templates
    const { data: templates, error } = await supabase
      .from('content_templates')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      templates 
    });
  } catch (error) {
    console.error('Error fetching content templates:', error);
    return handleApiError(error, 'Failed to fetch content templates');
  }
});

/**
 * POST: Create a new content template
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const data = await request.json();
    
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
    
    // Create new template
    const { data: newTemplate, error } = await supabase
      .from('content_templates')
      .insert({
        name: data.name,
        description: data.description || '',
        icon: data.icon || null,
        fields: data.fields,
        created_by: user.id
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      template: newTemplate[0]
    });
  } catch (error) {
    console.error('Error creating content template:', error);
    return handleApiError(error, 'Failed to create content template');
  }
}); 