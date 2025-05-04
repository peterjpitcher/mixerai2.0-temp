import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

/**
 * GET endpoint to retrieve all invitations for a specific workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const workflowId = params.id;
    
    // Fetch all invitations for this workflow
    const { data: invitations, error } = await supabase
      .from('workflow_invitations')
      .select('*')
      .eq('workflow_id', workflowId);
    
    if (error) {
      console.error('Error fetching workflow invitations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch workflow invitations' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      invitations: invitations || []
    });
  } catch (error) {
    console.error('Error in workflow invitations API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 