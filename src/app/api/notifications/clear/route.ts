import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withCSRF } from '@/lib/api/with-csrf';

export const DELETE = withCSRF(async function () {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all notifications for the user
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notifications:', error);
      return NextResponse.json({ success: false, error: 'Failed to clear notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error in clear notifications endpoint:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
})