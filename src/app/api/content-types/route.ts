import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    // During static site generation, return mock data
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Returning mock content types during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        contentTypes: [
          { id: '1', name: 'Article', description: 'Long-form content' },
          { id: '2', name: 'Product Description', description: 'Product details' }
        ]
      });
    }
    
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
    return handleApiError(error, 'Error fetching content types');
  }
} 