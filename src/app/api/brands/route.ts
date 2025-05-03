import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';

// Sample fallback data for when DB connection fails
const getFallbackBrands = () => {
  return [
    {
      id: '1',
      name: 'Sample Brand',
      website_url: 'https://example.com',
      country: 'United States',
      language: 'English',
      brand_identity: 'Modern and innovative',
      tone_of_voice: 'Professional but friendly',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 5
    },
    {
      id: '2',
      name: 'Another Brand',
      website_url: 'https://another-example.com',
      country: 'United Kingdom',
      language: 'English',
      brand_identity: 'Traditional and trusted',
      tone_of_voice: 'Formal and authoritative',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 3
    }
  ];
};

export async function GET() {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock brands during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        brands: getFallbackBrands()
      });
    }
    
    console.log('Attempting to fetch brands from database');
    const supabase = createSupabaseAdminClient();
    
    // Get all brands
    const { data: brands, error } = await supabase
      .from('brands')
      .select('*, content:content(count)')
      .order('name');
    
    if (error) throw error;
    
    // Format the response to match existing structure
    const formattedBrands = brands.map(brand => ({
      ...brand,
      content_count: brand.content?.[0]?.count || 0
    }));

    console.log(`Successfully fetched ${formattedBrands.length} brands`);
    
    return NextResponse.json({ 
      success: true, 
      brands: formattedBrands 
    });
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback brands data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        brands: getFallbackBrands()
      });
    }
    
    return handleApiError(error, 'Error fetching brands');
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Insert the new brand
    const { data, error } = await supabase
      .from('brands')
      .insert([{
        name: body.name,
        website_url: body.website_url || null,
        country: body.country || null,
        language: body.language || null,
        brand_identity: body.brand_identity || null,
        tone_of_voice: body.tone_of_voice || null,
        guardrails: body.guardrails || null,
        content_vetting_agencies: body.content_vetting_agencies || null
      }])
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      brand: data[0]
    });
  } catch (error) {
    return handleApiError(error, 'Error creating brand');
  }
} 