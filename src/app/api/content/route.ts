import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Get all content with related details
    const { data: content, error } = await supabase
      .from('content')
      .select(`
        *,
        brands:brand_id(name),
        content_types:content_type_id(name),
        profiles:created_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Format the response to match existing structure
    const formattedContent = content.map(item => ({
      ...item,
      brand_name: item.brands?.name || null,
      content_type_name: item.content_types?.name || null,
      created_by_name: item.profiles?.full_name || null
    }));

    return NextResponse.json({ 
      success: true, 
      content: formattedContent 
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.brand_id || !data.content_type_id || !data.title || !data.body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Create new content entry
    const { data: newContent, error } = await supabase
      .from('content')
      .insert({
        brand_id: data.brand_id,
        content_type_id: data.content_type_id,
        created_by: data.created_by,
        title: data.title,
        body: data.body,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        status: data.status || 'draft',
        workflow_id: data.workflow_id || null,
        current_step: data.current_step || 0
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      content: newContent[0]
    });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create content' },
      { status: 500 }
    );
  }
} 