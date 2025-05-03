import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';

// Sample fallback data for when DB connection fails
const getFallbackContentTypes = () => {
  return [
    {
      id: '1',
      name: 'Article',
      description: 'Long-form content pieces like blog posts and articles',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Retailer PDP',
      description: 'Product description pages for retailer websites',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Owned PDP',
      description: 'Product description pages for brand-owned websites',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

export async function GET() {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock content types during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: getFallbackContentTypes()
      });
    }
    
    console.log('Attempting to fetch content types from database');
    const supabase = createSupabaseAdminClient();
    
    // Get all content types
    const { data: contentTypes, error } = await supabase
      .from('content_types')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    console.log(`Successfully fetched ${contentTypes.length} content types`);
    
    return NextResponse.json({ 
      success: true, 
      data: contentTypes 
    });
  } catch (error: any) {
    console.error('Error fetching content types:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback content types data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        data: getFallbackContentTypes()
      });
    }
    
    return handleApiError(error, 'Error fetching content types');
  }
} 