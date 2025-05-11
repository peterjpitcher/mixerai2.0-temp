import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
  const { id } = params;

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
// export const PUT = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
//   const { id } = params;
//   // ... implementation ...
//   return NextResponse.json({ success: true, message: `Content ${id} updated` });
// });

// Placeholder for DELETE - to be implemented as needed
// export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
//   const { id } = params;
//   // ... implementation ...
//   return NextResponse.json({ success: true, message: `Content ${id} deleted` });
// }); 