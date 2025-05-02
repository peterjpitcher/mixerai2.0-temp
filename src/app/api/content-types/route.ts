import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Get all content types
    const { data: contentTypes, error } = await supabase
      .from('content_types')
      .select('*')
      .order('name');
    
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      contentTypes 
    });
  } catch (error) {
    console.error('Error fetching content types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content types' },
      { status: 500 }
    );
  }
} 