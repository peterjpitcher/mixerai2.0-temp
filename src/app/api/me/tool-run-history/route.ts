import { NextRequest, NextResponse } from 'next/server';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Using server client

export const dynamic = 'force-dynamic';

export const GET = withAuthMonitoringAndCSRF(async (request: NextRequest) => {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get('tool_name');
    const pageParam = Number(searchParams.get('page') || '1');
    const limitParam = Number(searchParams.get('limit') || '20');
    const statusParam = searchParams.get('status');
    const brandIdParam = searchParams.get('brand_id');

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 100) : 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tool_run_history')
      .select('*', { count: 'exact' })
      // RLS will handle user_id filtering automatically when using createSupabaseServerClient
      // .eq('user_id', user.id) 
      .order('run_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (toolName) {
      query = query.eq('tool_name', toolName);
    }

    if (statusParam === 'success' || statusParam === 'failure') {
      query = query.eq('status', statusParam);
    }

    if (brandIdParam) {
      query = query.eq('brand_id', brandIdParam);
    }

    const { data: history, error, count } = await query;

    if (error) {
      console.error('[ToolRunHistoryAPI] Error fetching history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tool run history.', details: error.message },
        { status: 500 }
      );
    }

    // Map database fields to expected frontend fields
    const mappedHistory = history?.map(item => ({
      ...item,
      run_at: item.run_at,
      // Ensure inputs/outputs are objects
      inputs: item.inputs || {},
      outputs: item.outputs || {}
    })) || [];

    return NextResponse.json({
      success: true,
      history: mappedHistory,
      pagination: {
        page,
        limit,
        total: count ?? mappedHistory.length,
      },
    });

  } catch (error: unknown) {
    console.error('[ToolRunHistoryAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}); 
