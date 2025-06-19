import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Using server client

export const dynamic = 'force-dynamic';

export const GET = withAuthAndMonitoring(async (request: NextRequest) => {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get('tool_name');

    let query = supabase
      .from('tool_run_history')
      .select('*')
      // RLS will handle user_id filtering automatically when using createSupabaseServerClient
      // .eq('user_id', user.id) 
      .order('run_at', { ascending: false })
      .limit(50); // Let's limit to 50 records for now

    if (toolName) {
      query = query.eq('tool_name', toolName);
    }

    const { data: history, error } = await query;

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

    return NextResponse.json({ success: true, history: mappedHistory });

  } catch (error: unknown) {
    console.error('[ToolRunHistoryAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}); 