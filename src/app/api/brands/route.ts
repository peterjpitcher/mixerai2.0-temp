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
    const supabase = createSupabaseAdminClient();
    const body = await req.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Format guardrails to ensure proper display
    let formattedGuardrails = body.guardrails || null;
    
    // Handle case where guardrails might be in array format
    if (formattedGuardrails) {
      // If it's already an array (parsed from JSON)
      if (Array.isArray(formattedGuardrails)) {
        formattedGuardrails = formattedGuardrails.map(item => `- ${item}`).join('\n');
      } 
      // If it's a JSON string containing an array
      else if (typeof formattedGuardrails === 'string' && 
              formattedGuardrails.trim().startsWith('[') && 
              formattedGuardrails.trim().endsWith(']')) {
        try {
          const guardrailsArray = JSON.parse(formattedGuardrails);
          if (Array.isArray(guardrailsArray)) {
            formattedGuardrails = guardrailsArray.map(item => `- ${item}`).join('\n');
          }
        } catch (e) {
          // If parsing fails, use as is
          console.log("Failed to parse guardrails as JSON array in POST, using as-is");
        }
      }
    }
    
    // Generate brand_summary from identity if provided
    let brandSummary = body.brand_summary || null;
    if (!brandSummary && body.brand_identity) {
      // Get first 250 characters from brand_identity
      brandSummary = body.brand_identity.slice(0, 250);
      if (body.brand_identity.length > 250) {
        brandSummary += '...';
      }
    }
    
    // Insert the new brand with the user ID as created_by
    const { data, error } = await supabase
      .from('brands')
      .insert([{
        name: body.name,
        website_url: body.website_url || null,
        country: body.country || null,
        language: body.language || null,
        brand_identity: body.brand_identity || null,
        tone_of_voice: body.tone_of_voice || null,
        guardrails: formattedGuardrails,
        content_vetting_agencies: body.content_vetting_agencies || null,
        brand_color: body.brand_color || '#3498db',
        brand_summary: brandSummary,
        approved_content_types: body.approved_content_types || null,
        created_by: user.id // Add the authenticated user ID
      }])
      .select();
    
    if (error) throw error;
    
    // Set brand admin permissions (if provided)
    if (body.brand_admin_ids && Array.isArray(body.brand_admin_ids) && body.brand_admin_ids.length > 0 && data?.[0]?.id) {
      const brandId = data[0].id;
      
      // Process each brand admin ID
      for (const brandAdminId of body.brand_admin_ids) {
        // Create admin permission record for each brand admin
        const { error: permissionError } = await supabase
          .from('user_brand_permissions')
          .upsert({
            user_id: brandAdminId,
            brand_id: brandId,
            role: 'admin'
          });
        
        if (permissionError) {
          console.error(`Error setting brand admin permission for ${brandAdminId}:`, permissionError);
          // Don't throw here, as the brand has been successfully created
        }
      }
      
      // Also add a permission for the creating user if not already included
      if (!body.brand_admin_ids.includes(user.id)) {
        const { error: creatorPermissionError } = await supabase
          .from('user_brand_permissions')
          .upsert({
            user_id: user.id,
            brand_id: brandId,
            role: 'admin' // Give admin rights to creator as well
          });
        
        if (creatorPermissionError) {
          console.error('Error setting creator permission:', creatorPermissionError);
        }
      }
    } 
    // Backwards compatibility for single brand_admin_id
    else if (body.brand_admin_id && data?.[0]?.id) {
      const brandId = data[0].id;
      const brandAdminId = body.brand_admin_id;
      
      // Create admin permission record for the brand admin
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .upsert({
          user_id: brandAdminId,
          brand_id: brandId,
          role: 'admin'
        });
      
      if (permissionError) {
        console.error('Error setting brand admin permission:', permissionError);
      }
      
      // Also add a permission for the creating user (if different from admin)
      if (user.id !== brandAdminId) {
        const { error: creatorPermissionError } = await supabase
          .from('user_brand_permissions')
          .upsert({
            user_id: user.id,
            brand_id: brandId,
            role: 'admin' // Give admin rights to creator as well
          });
        
        if (creatorPermissionError) {
          console.error('Error setting creator permission:', creatorPermissionError);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      brand: data[0]
    });
  } catch (error) {
    return handleApiError(error, 'Error creating brand');
  }
}); 