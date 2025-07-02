import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const DELETE = withAuthAndCSRF(async function (req: NextRequest, user: User) {
  try {
    const supabase = createSupabaseServerClient();

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