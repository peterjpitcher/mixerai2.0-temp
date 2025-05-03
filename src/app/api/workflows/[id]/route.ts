import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET endpoint to retrieve a specific workflow by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    
    // Get the workflow with brand and content type information
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        brands:brand_id(name),
        content_types:content_type_id(name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 404 }
        );
      }
      throw error;
    }
    
    // Format the response
    const formattedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      brand_id: workflow.brand_id,
      brand_name: workflow.brands?.name || null,
      content_type_id: workflow.content_type_id,
      content_type_name: workflow.content_types?.name || null,
      steps: workflow.steps,
      steps_count: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    };

    return NextResponse.json({ 
      success: true, 
      workflow: formattedWorkflow 
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint to update a specific workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    const body = await request.json();
    
    // Validate steps format if provided
    if (body.steps && !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Steps must be an array' },
        { status: 400 }
      );
    }
    
    // Process assignees - create invitations for each email if needed
    const steps = body.steps || [];
    const invitations = [];
    
    for (const step of steps) {
      if (step.assignees && Array.isArray(step.assignees)) {
        for (const assignee of step.assignees) {
          // Skip assignees that already have an ID
          if (assignee.id) continue;
          
          // Check if the user exists
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', assignee.email)
            .maybeSingle();
            
          if (existingUser) {
            // User exists, set their ID in the assignee
            assignee.id = existingUser.id;
          } else {
            // User doesn't exist, prepare an invitation
            invitations.push({
              workflow_id: id,
              step_id: step.id,
              email: assignee.email,
              role: step.role || 'editor',
              invite_token: uuidv4(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            });
          }
        }
      }
    }
    
    // Prepare update object with only valid fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.brand_id !== undefined) updateData.brand_id = body.brand_id;
    if (body.content_type_id !== undefined) updateData.content_type_id = body.content_type_id;
    if (body.steps !== undefined) updateData.steps = steps;
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Update the workflow
    const { data, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
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
    
    // Check if any rows were affected
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // If there are new invitations, create them in the workflow_invitations table
    if (invitations.length > 0) {
      // Before creating new invitations, delete any existing ones that might be outdated
      await supabase
        .from('workflow_invitations')
        .delete()
        .eq('workflow_id', id)
        .in('status', ['pending']);
        
      // Insert the new invitations
      const { error: invitationError } = await supabase
        .from('workflow_invitations')
        .insert(invitations);
      
      if (invitationError) {
        console.error('Error creating workflow invitations:', invitationError);
        // Don't fail the entire request if invitations fail
      } else {
        console.log(`Created ${invitations.length} workflow invitations`);
        
        // TODO: Send invitation emails (this would be implemented separately)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      workflow: data[0]
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove a specific workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const id = params.id;
    
    // First check if the workflow exists and has associated content
    const { data: contentCount, error: countError } = await supabase
      .from('content')
      .select('id', { count: 'exact' })
      .eq('workflow_id', id);
      
    if (countError) throw countError;
    
    // If there's content using this workflow, prevent deletion
    if (contentCount && contentCount.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete workflow that has associated content' 
        },
        { status: 409 }
      );
    }
    
    // Delete associated workflow invitations
    await supabase
      .from('workflow_invitations')
      .delete()
      .eq('workflow_id', id);
    
    // Delete the workflow
    const { error, count } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Check if any rows were affected
    if (count === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Workflow deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
} 