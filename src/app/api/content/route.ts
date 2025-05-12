import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { Database } from '@/types/supabase';

/**
 * GET: Retrieve all content, optionally filtered by a search query.
 * Joined with brand, content type, and creator details.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const brandId = url.searchParams.get('brandId');

    let queryBuilder = supabase
      .from('content')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        brand_id,
        brands ( name, brand_color ),
        content_type_id,
        content_types ( name ),
        created_by,
        profiles ( full_name, avatar_url ),
        template_id,
        content_templates ( name, icon ),
        current_step,
        workflow_id
      `)
      .order('updated_at', { ascending: false });

    if (query) {
      // Apply search query to title and body (using textSearch for body might be better if enabled and FTS is set up)
      // For now, using ilike on title. Body search via ilike can be slow on large text fields.
      // Consider adding a dedicated search vector column in Postgres for more performant full-text search on body.
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,meta_description.ilike.%${query}%`);
    }

    if (brandId) {
      queryBuilder = queryBuilder.eq('brand_id', brandId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching content:', error);
      throw error;
    }

    // Flatten related data for easier client consumption
    const formattedContent = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      brand_id: item.brand_id,
      brand_name: item.brands?.name || null,
      brand_color: item.brands?.brand_color || null,
      content_type_id: item.content_type_id,
      content_type_name: item.content_types?.name || null,
      created_by: item.created_by,
      created_by_name: item.profiles?.full_name || null,
      creator_avatar_url: item.profiles?.avatar_url || null,
      template_id: item.template_id,
      template_name: item.content_templates?.name || null,
      template_icon: item.content_templates?.icon || null,
      current_step: item.current_step,
      workflow_id: item.workflow_id,
    }));

    return NextResponse.json({
      success: true,
      data: formattedContent,
    });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch content');
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const data = await request.json();
    
    if (!data.brand_id || !data.title || !data.body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    const { data: newContent, error } = await supabase
      .from('content')
      .insert({
        brand_id: data.brand_id,
        created_by: user.id,
        title: data.title,
        body: data.body,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        status: data.status || 'draft',
        workflow_id: data.workflow_id || null,
        current_step: data.current_step || 0,
        template_id: data.template_id || null
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      content: newContent[0]
    });
  } catch (error) {
    return handleApiError(error, 'Failed to create content', 500);
  }
}); 