import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';

// Sample fallback data for when DB connection fails
const getFallbackWorkflows = () => {
  return [
    {
      id: '1',
      name: 'Sample Content Workflow',
      brand_id: '1',
      brand_name: 'Sample Brand',
      content_type_id: '1',
      content_type_name: 'Article',
      steps: [
        { id: '1', name: 'Draft', approvers: [] },
        { id: '2', name: 'Review', approvers: [] },
        { id: '3', name: 'Publish', approvers: [] }
      ],
      steps_count: 3,
      content_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Another Workflow',
      brand_id: '2',
      brand_name: 'Another Brand',
      content_type_id: '2',
      content_type_name: 'Retailer PDP',
      steps: [
        { id: '1', name: 'Draft', approvers: [] },
        { id: '2', name: 'Publish', approvers: [] }
      ],
      steps_count: 2,
      content_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

/**
 * GET endpoint to retrieve all workflows with related data
 */
export async function GET(request: NextRequest) {
  try {
    // During static site generation, return mock data
    if (isBuildPhase()) {
      console.log('Returning mock workflows during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        workflows: getFallbackWorkflows()
      });
    }
    
    console.log('Attempting to fetch workflows from database');
    const supabase = createSupabaseAdminClient();
    
    // Parse URL to check for brand_id filter
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    
    // Base query
    let query = supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name),
        content_types:content_type_id(name),
        content:content(count)
      `)
      .order('created_at', { ascending: false });
    
    // Apply brand_id filter if specified
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    // Execute the query
    const { data: workflows, error } = await query;
    
    if (error) throw error;
    
    // Format the response
    const formattedWorkflows = workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      brand_id: workflow.brand_id,
      brand_name: workflow.brands?.name || null,
      content_type_id: workflow.content_type_id,
      content_type_name: workflow.content_types?.name || null,
      steps: workflow.steps,
      steps_count: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
      content_count: workflow.content?.[0]?.count || 0,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    }));

    console.log(`Successfully fetched ${formattedWorkflows.length} workflows`);
    
    return NextResponse.json({ 
      success: true, 
      workflows: formattedWorkflows 
    });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    
    // Only use fallback for genuine database connection errors
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback workflows data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        workflows: getFallbackWorkflows()
      });
    }
    
    return handleApiError(error, 'Error fetching workflows');
  }
}

/**
 * POST endpoint to create a new workflow
 */
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Workflow name is required' },
        { status: 400 }
      );
    }
    
    if (!body.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.content_type_id) {
      return NextResponse.json(
        { success: false, error: 'Content type ID is required' },
        { status: 400 }
      );
    }
    
    // Validate steps format if provided
    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    // Insert the new workflow
    const { data, error } = await supabase
      .from('workflows')
      .insert([{
        name: body.name,
        brand_id: body.brand_id,
        content_type_id: body.content_type_id,
        steps: body.steps || []
      }])
      .select();
    
    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'A workflow for this brand and content type already exists' 
          },
          { status: 409 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: data[0]
    });
  } catch (error) {
    return handleApiError(error, 'Error creating workflow');
  }
} 