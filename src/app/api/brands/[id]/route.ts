import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';

// GET a single brand by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestHeaders = Object.fromEntries(request.headers.entries());
  console.log(`🔍 API: GET /api/brands/${params.id} - Request headers:`, requestHeaders);
  
  try {
    // Return mock data during static site generation
    if (isBuildPhase()) {
      console.log('Returning mock brand during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        brand: {
          id: params.id,
          name: 'Demo Brand',
          website_url: 'https://example.com',
          country: 'United States',
          language: 'English', 
          brand_identity: 'A sample brand identity for demonstration purposes.',
          tone_of_voice: 'Professional yet friendly, with a focus on clarity and simplicity.',
          guardrails: 'Avoid technical jargon. Focus on benefits rather than features.',
          content_vetting_agencies: 'FDA, FTC, EPA',
          brand_color: '#3498db',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          'x-data-source': 'mock-build-phase'
        }
      });
    }
    
    console.log(`Attempting to fetch brand with ID: ${params.id}`);
    
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    // Get the brand
    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    console.log(`Successfully fetched brand: ${brand.name}`);
    
    // Add metadata to help identify the response (using type assertion for extra properties)
    (brand as any).source = 'database';
    (brand as any).fetchedAt = new Date().toISOString();
    
    return NextResponse.json({ 
      success: true, 
      brand,
      meta: {
        source: 'database',
        isFallback: false,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'x-data-source': 'database'
      }
    });
  } catch (error: any) {
    console.error('Error fetching brand:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback brand data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        brand: {
          id: params.id,
          name: 'Fallback Brand (Connection Error)',
          website_url: 'https://example.com',
          country: 'United States',
          language: 'English', 
          brand_identity: 'Fallback brand data due to database connection issue.',
          tone_of_voice: 'Professional yet friendly.',
          guardrails: 'Avoid technical jargon.',
          content_vetting_agencies: 'FDA, FTC',
          brand_color: '#e74c3c',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: 'fallback',
          fetchedAt: new Date().toISOString()
        },
        meta: {
          source: 'fallback',
          isFallback: true,
          errorType: 'database_connection',
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          'x-data-source': 'fallback'
        }
      });
    }
    
    return handleApiError(error, 'Error fetching brand');
  }
}

// PUT endpoint to update a brand
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Prepare update object with only valid fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.website_url !== undefined) updateData.website_url = body.website_url;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.brand_identity !== undefined) updateData.brand_identity = body.brand_identity;
    if (body.tone_of_voice !== undefined) updateData.tone_of_voice = body.tone_of_voice;
    if (body.brand_color !== undefined) updateData.brand_color = body.brand_color;
    if (body.approved_content_types !== undefined) updateData.approved_content_types = body.approved_content_types;
    
    // Handle guardrails specially to ensure proper format
    if (body.guardrails !== undefined) {
      // Handle case where guardrails might be a JSON array string or an actual array
      let formattedGuardrails = body.guardrails;
      
      // If it's already an array (parsed from JSON)
      if (Array.isArray(body.guardrails)) {
        formattedGuardrails = body.guardrails.map(item => `- ${item}`).join('\n');
      } 
      // If it's a JSON string containing an array
      else if (typeof body.guardrails === 'string' && 
               body.guardrails.trim().startsWith('[') && 
               body.guardrails.trim().endsWith(']')) {
        try {
          const guardrailsArray = JSON.parse(body.guardrails);
          if (Array.isArray(guardrailsArray)) {
            formattedGuardrails = guardrailsArray.map(item => `- ${item}`).join('\n');
          }
        } catch (e) {
          // If parsing fails, use as is
          console.log("Failed to parse guardrails as JSON array, using as-is");
        }
      }
      
      updateData.guardrails = formattedGuardrails;
    }
    
    if (body.content_vetting_agencies !== undefined) updateData.content_vetting_agencies = body.content_vetting_agencies;
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Update the brand
    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Check if any rows were affected
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      brand: data[0] 
    });
  } catch (error) {
    return handleApiError(error, 'Error updating brand');
  }
}

// DELETE a brand by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("DELETE brand API called for ID:", params.id);
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    // Parse the URL to get the query parameters
    const url = new URL(request.url);
    const deleteCascade = url.searchParams.get('deleteCascade') === 'true';
    console.log("deleteCascade parameter:", deleteCascade);
    
    // First check if the brand exists
    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!brand) {
      console.log("Brand not found:", id);
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    // Check if there's any content associated with this brand
    const { count: contentCount, error: countError } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
    
    if (countError) throw countError;
    
    // Check if there's any workflows associated with this brand
    const { count: workflowCount, error: workflowCountError } = await supabase
      .from('workflows')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
    
    if (workflowCountError) throw workflowCountError;
    
    const contentCountValue = contentCount || 0;
    const workflowCountValue = workflowCount || 0;
    
    console.log("Associated content count:", contentCountValue);
    console.log("Associated workflow count:", workflowCountValue);
    
    // If cascade delete is not specified, and there's associated content or workflows, return an error
    if (!deleteCascade && (contentCountValue > 0 || workflowCountValue > 0)) {
      console.log("Cascade delete required but not specified");
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete brand. It has ${contentCountValue} piece${contentCountValue === 1 ? '' : 's'} of content and ${workflowCountValue} workflow${workflowCountValue === 1 ? '' : 's'} associated with it.`,
          contentCount: contentCountValue,
          workflowCount: workflowCountValue,
          requiresCascade: true
        },
        { status: 400 }
      );
    }
    
    // If cascade delete is specified, first delete all associated content and workflows
    if (deleteCascade) {
      // For cascade delete, we'll do it manually since RPC may not be set up
      // First delete all content
      if (contentCountValue > 0) {
        const { error: contentDeleteError } = await supabase
          .from('content')
          .delete()
          .eq('brand_id', id);
        
        if (contentDeleteError) throw contentDeleteError;
      }
      
      // Then delete all workflows
      if (workflowCountValue > 0) {
        const { error: workflowDeleteError } = await supabase
          .from('workflows')
          .delete()
          .eq('brand_id', id);
        
        if (workflowDeleteError) throw workflowDeleteError;
      }
      
      // Finally delete the brand
      const { error: deleteError } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      return NextResponse.json({ 
        success: true, 
        message: `Brand "${brand.name}" and all associated content and workflows have been deleted successfully` 
      });
    }
    
    // If we're here, then there's no associated content or workflows, so just delete the brand
    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ 
      success: true, 
      message: `Brand "${brand.name}" has been deleted successfully` 
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting brand');
  }
} 