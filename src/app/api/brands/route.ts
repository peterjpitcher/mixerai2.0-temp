import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET() {
  try {
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

    return NextResponse.json({ 
      success: true, 
      brands: formattedBrands 
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
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
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create brand' },
      { status: 500 }
    );
  }
} 