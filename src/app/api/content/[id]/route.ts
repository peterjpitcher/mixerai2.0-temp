import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, user: User, context: { params: { id: string } }) => {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    
    const { data: content, error } = await supabase
      .from('content')
      .select(`
        *,
        brands:brand_id(name, brand_color),
        profiles:created_by(full_name),
        content_templates:template_id(id, name, icon, fields) 
      `)
      .eq('id', id)
      .single(); // Use single() as we expect one record or null

    if (error) {
      if (error.code === 'PGRST116') { // PGRST116: "Fetched result not found"
        return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
      }
      throw error;
    }

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    // Flatten the nested data for easier consumption on the client if desired
    const formattedContent = {
      ...content,
      brand_name: content.brands?.name || null,
      brand_color: content.brands?.brand_color || null,
      created_by_name: content.profiles?.full_name || null,
      template_name: content.content_templates?.name || null,
      template_icon: content.content_templates?.icon || null,
      // Retain the full content_templates object if needed for all fields
      // content_template: content.content_templates 
    };
    // Remove the original nested objects if they are fully flattened to avoid redundancy
    // delete formattedContent.brands;
    // delete formattedContent.profiles;
    // delete formattedContent.content_templates; // Keep this one if you want the full template details available

    return NextResponse.json({ 
      success: true, 
      data: formattedContent 
    });

  } catch (error: any) {
    return handleApiError(error, `Failed to fetch content with ID: ${id}`);
  }
});

// Placeholder for PUT (update) - to be implemented as needed
export const PUT = withAuth(async (request: NextRequest, user: User, context: { params: { id: string } }) => {
  const id = context.params.id;
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();

    // Define allowed fields for update
    const allowedFields = ['title', 'body', 'meta_title', 'meta_description', 'status'];
    const updateData: Record<string, any> = {};

    // Filter request body to include only allowed fields
    for (const key of allowedFields) {
      if (body.hasOwnProperty(key)) {
        // Add specific validation if needed (e.g., for status enum)
        if (key === 'status') {
          const validStatuses: Database['public']['Enums']['content_status'][] = [
            'draft', 'pending_review', 'approved', 'published', 'rejected'
          ];
          if (!validStatuses.includes(body.status)) {
             return NextResponse.json({ success: false, error: `Invalid status value: ${body.status}` }, { status: 400 });
          }
        }
        updateData[key] = body[key];
      }
    }

    // Ensure at least one valid field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid fields provided for update. Allowed fields: title, body, meta_title, meta_description, status' 
      }, { status: 400 });
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: updatedContent, error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', id)
      .select()
      .single(); // Use single to get the updated record back

    if (error) {
      if (error.code === 'PGRST116') { // Record not found for update
        return NextResponse.json({ success: false, error: 'Content not found for update' }, { status: 404 });
      }
      console.error('Error updating content:', error);
      throw error;
    }

    if (!updatedContent) {
        // Should ideally not happen if error is null, but good practice to check
        return NextResponse.json({ success: false, error: 'Content not found after update attempt' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedContent 
    });

  } catch (error: any) {
    return handleApiError(error, `Failed to update content with ID: ${id}`);
  }
});

// Placeholder for DELETE - to be implemented as needed
// export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
//   const { id } = params;
//   // ... implementation ...
//   return NextResponse.json({ success: true, message: `Content ${id} deleted` });
// }); 