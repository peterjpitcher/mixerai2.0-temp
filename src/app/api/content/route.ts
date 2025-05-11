import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    
    let query = supabase
      .from('content')
      .select(`
        *,
        brands:brand_id(name, brand_color),
        profiles:created_by(full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data: content, error } = await query;
    
    if (error) throw error;
    
    const formattedContent = content.map(item => ({
      ...item,
      brand_name: item.brands?.name || null,
      brand_color: item.brands?.brand_color || null,
      created_by_name: item.profiles?.full_name || null
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: formattedContent 
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