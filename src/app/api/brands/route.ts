import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { NextRequest } from 'next/server';

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
      brand_summary: 'Modern and innovative brand with a professional but friendly tone.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 5,
      brand_color: '#3498db'
    },
    {
      id: '2',
      name: 'Another Brand',
      website_url: 'https://another-example.com',
      country: 'United Kingdom',
      language: 'English',
      brand_identity: 'Traditional and trusted',
      tone_of_voice: 'Formal and authoritative',
      brand_summary: 'Traditional and trusted brand with a formal and authoritative tone.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 3,
      brand_color: '#e74c3c'
    }
  ];
};

// Authenticated GET handler for brands
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock brands during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: getFallbackBrands()
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
      data: formattedBrands 
    });
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback brands data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        data: getFallbackBrands()
      });
    }
    
    return handleApiError(error, 'Error fetching brands');
  }
});

// Authenticated POST handler for creating brands
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    // Use the standard Supabase client for RPC calls
    const supabase = createSupabaseAdminClient(); 
    const body = await req.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Format guardrails (retain existing formatting logic)
    let formattedGuardrails = body.guardrails || null;
    if (formattedGuardrails) {
      if (Array.isArray(formattedGuardrails)) {
        formattedGuardrails = formattedGuardrails.map(item => `- ${item}`).join('\n');
      } 
      else if (typeof formattedGuardrails === 'string' && 
              formattedGuardrails.trim().startsWith('[') && 
              formattedGuardrails.trim().endsWith(']')) {
        try {
          const guardrailsArray = JSON.parse(formattedGuardrails);
          if (Array.isArray(guardrailsArray)) {
            formattedGuardrails = guardrailsArray.map(item => `- ${item}`).join('\n');
          }
        } catch (e) {
          console.log("Failed to parse guardrails as JSON array in POST, using as-is");
        }
      }
    }

    // Call the database function to create the brand and set the creator as admin
    const { data: newBrandId, error: rpcError } = await supabase.rpc(
      'create_brand_and_set_admin' as any,
      {
        creator_user_id: user.id,
        brand_name: body.name,
        brand_website_url: body.website_url || null,
        brand_country: body.country || null,
        brand_language: body.language || null,
        brand_identity_text: body.brand_identity || null,
        brand_tone_of_voice: body.tone_of_voice || null,
        brand_guardrails: formattedGuardrails,
        brand_content_vetting_agencies: body.content_vetting_agencies || null
      }
    );

    if (rpcError) {
      console.error('RPC Error creating brand:', rpcError);
      throw new Error(`Failed to create brand: ${rpcError.message}`);
    }

    if (!newBrandId) {
      throw new Error('Failed to create brand, no ID returned from function.');
    }
    
    // Handle additional brand admins if provided (excluding the creator)
    const additionalAdminIds = (body.brand_admin_ids || []).filter((id: string) => id !== user.id);

    if (Array.isArray(additionalAdminIds) && additionalAdminIds.length > 0) {
      const permissionUpserts = additionalAdminIds.map((adminId: string) => ({
        user_id: adminId,
        brand_id: newBrandId as string,
        role: 'admin' as 'admin'
      }));

      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .upsert(permissionUpserts);

      if (permissionError) {
        // Log the error but don't fail the request, as the brand exists with the creator as admin
        console.error('Error setting additional brand admin permissions:', permissionError);
      }
    }

    // Fetch the newly created brand data to return
    const { data: newBrandData, error: fetchError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', newBrandId)
      .single();

    if (fetchError) {
      console.error('Error fetching newly created brand:', fetchError);
      return NextResponse.json({ 
        success: true, 
        brand_id: newBrandId,
        warning: 'Brand created, but failed to fetch full data.'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: newBrandData 
    });
  } catch (error) {
    return handleApiError(error, 'Error creating brand');
  }
}); 