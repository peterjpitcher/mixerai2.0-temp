import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Using server client for RLS with user context
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export const GET = withAuthAndMonitoring(async (request: NextRequest, user) => {
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

    return NextResponse.json({ success: true, history });

  } catch (error: any) {
    console.error('[ToolRunHistoryAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
}); 