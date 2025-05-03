import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';

// Sample fallback data for when DB connection fails
const getFallbackContent = () => {
  return [
    {
      id: '1',
      title: 'Sample Content Article',
      body: 'This is sample content for when the database is unavailable.',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brand_name: 'Sample Brand',
      content_type_name: 'Article',
      created_by_name: 'System'
    },
    {
      id: '2',
      title: 'Another Sample Content',
      body: 'Second sample content for when the database is unavailable.',
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brand_name: 'Another Brand',
      content_type_name: 'Retailer PDP',
      created_by_name: 'System'
    }
  ];
};

export async function GET(request: NextRequest) {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock content during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        content: getFallbackContent()
      });
    }
    
    console.log('Attempting to fetch content from database');
    const supabase = createSupabaseAdminClient();
    
    // Parse URL to check for brand_id filter
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    
    // Base query
    let query = supabase
      .from('content')
      .select(`
        *,
        brands:brand_id(name),
        content_types:content_type_id(name),
        profiles:created_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    // Apply brand_id filter if specified
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    // Execute the query
    const { data: content, error } = await query;
    
    if (error) throw error;
    
    // Format the response to match existing structure
    const formattedContent = content.map(item => ({
      ...item,
      brand_name: item.brands?.name || null,
      content_type_name: item.content_types?.name || null,
      created_by_name: item.profiles?.full_name || null
    }));

    console.log(`Successfully fetched ${formattedContent.length} content items`);
    
    return NextResponse.json({ 
      success: true, 
      content: formattedContent 
    });
  } catch (error: any) {
    console.error('Error fetching content:', error);
    
    // Only use fallback data for genuine database connection errors, not automatically in production
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback content data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        content: getFallbackContent()
      });
    }
    
    return handleApiError(error, 'Failed to fetch content');
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
    return handleApiError(error, 'Failed to create content', 500);
  }
} 