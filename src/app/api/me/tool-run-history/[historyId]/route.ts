import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    historyId: string;
  };
}

export const GET = withAuthAndMonitoring(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as RouteParams;
  try {
    const supabase = createSupabaseServerClient();
    const { historyId } = params;

    if (!historyId) {
      return NextResponse.json(
        { success: false, error: 'History ID is required.' },
        { status: 400 }
      );
    }

    const { data: historyItem, error } = await supabase
      .from('tool_run_history')
      .select('*')
      .eq('id', historyId)
      // RLS policy should ensure user can only fetch their own or if admin, any.
      // For an extra layer, explicitly check user_id if not admin.
      // .eq('user_id', user.id) // This would be too restrictive if we want admins to see all history details.
      // RLS `select_own_or_admin_tool_run_history` handles this.
      .single();

    if (error) {
      console.error(`[ToolRunHistoryItemAPI] Error fetching history item ${historyId}:`, error);
      if (error.code === 'PGRST116') { // PGRST116: Row to be affected by Pre-Request Function (e.g. RLS) does not exist
        return NextResponse.json(
          { success: false, error: 'History item not found or access denied.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tool run history item.', details: error.message },
        { status: 500 }
      );
    }

    if (!historyItem) {
      return NextResponse.json(
        { success: false, error: 'History item not found.' },
        { status: 404 }
      );
    }
    
    // Double check ownership if user is not an admin, RLS should handle this, but belt and suspenders.
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin' && (historyItem as Record<string, unknown>).user_id !== user.id) {
        console.warn(`[ToolRunHistoryItemAPI] User ${user.id} attempted to access history item ${historyId} owned by ${(historyItem as Record<string, unknown>).user_id}`);
        return NextResponse.json(
            { success: false, error: 'Access denied to this history item.' },
            { status: 403 }
        );
    }

    return NextResponse.json({ success: true, historyItem });

  } catch (error: unknown) {
    console.error('[ToolRunHistoryItemAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}); 