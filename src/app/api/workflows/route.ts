import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

/**
 * GET endpoint to retrieve all workflows with related data
 */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Get all workflows with brand and content type information
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name),
        content_types:content_type_id(name),
        content:content(count)
      `)
      .order('created_at', { ascending: false });
    
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

    return NextResponse.json({ 
      success: true, 
      workflows: formattedWorkflows 
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    );
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
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
} 