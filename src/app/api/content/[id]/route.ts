import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// Define interfaces for structured data
interface AssigneeProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ProcessedWorkflowStep {
  id: string;
  name: string;
  description: string | null;
  step_order: number;
  role: string | null;
  approval_required: boolean | null;
  assigned_user_ids: string[] | null; // Keep original for reference if needed
  assignees: AssigneeProfile[];
}

interface WorkflowWithSteps {
  id: string;
  name: string;
  steps: ProcessedWorkflowStep[];
}

export const GET = withAuth(async (request: NextRequest, user: User, context: { params: { id: string } }) => {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    
    // Step 1: Fetch the main content record
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        *,
        brands:brand_id(name, brand_color),
        profiles!created_by(full_name),
        content_templates:template_id(id, name, icon, fields)
      `)
      .eq('id', id)
      .single();

    if (contentError) {
      if (contentError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
      }
      throw contentError;
    }

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    let workflowDataWithSteps: WorkflowWithSteps | null = null;
    if (content.workflow_id) {
      // Step 2: Fetch the associated workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select(`
          id,
          name
        `)
        .eq('id', content.workflow_id)
        .single();

      if (workflowError) {
        console.error(`Error fetching workflow ${content.workflow_id} for content ${id}:`, workflowError);
        // Continue without workflow data if it fails, or handle as critical error
      }

      if (workflow) {
        // Step 3: Fetch workflow steps for this workflow
        const { data: steps, error: stepsError } = await supabase
          .from('workflow_steps')
          .select(`
            id,
            name,
            description,
            step_order,
            role,
            approval_required,
            assigned_user_ids
          `)
          .eq('workflow_id', content.workflow_id)
          .order('step_order', { ascending: true });

        if (stepsError) {
          console.error(`Error fetching steps for workflow ${content.workflow_id}:`, stepsError);
          // Continue with workflow data but without steps, or handle as critical
        }

        let processedSteps: ProcessedWorkflowStep[] = [];
        if (steps && steps.length > 0) {
          // Collect all unique assignee IDs from all steps
          const allAssigneeIds = new Set<string>();
          steps.forEach(step => {
            if (step.assigned_user_ids && Array.isArray(step.assigned_user_ids)) {
              step.assigned_user_ids.forEach(userId => allAssigneeIds.add(userId));
            }
          });

          let assigneeProfilesMap = new Map<string, AssigneeProfile>();
          if (allAssigneeIds.size > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .in('id', Array.from(allAssigneeIds));

            if (profilesError) {
              console.error('Error fetching assignee profiles:', profilesError);
            } else if (profilesData) {
              profilesData.forEach(p => assigneeProfilesMap.set(p.id, p));
            }
          }
          
          processedSteps = steps.map(step => {
            const assigneesDetails = (step.assigned_user_ids && Array.isArray(step.assigned_user_ids))
              ? step.assigned_user_ids.map(userId => assigneeProfilesMap.get(userId)).filter(Boolean) as AssigneeProfile[]
              : [];
            return { 
              ...step, 
              assignees: assigneesDetails 
            };
          });
        }
        workflowDataWithSteps = { ...workflow, steps: processedSteps };
      }
    }

    const formattedContent = {
      ...content,
      brand_name: content.brands?.name || null,
      brand_color: content.brands?.brand_color || null,
      created_by_name: content.profiles?.full_name || null,
      template_name: content.content_templates?.name || null,
      template_icon: content.content_templates?.icon || null,
      workflow: workflowDataWithSteps // Embed the workflow with its steps and assignees
    };
    
    // Optionally remove original nested objects if they are fully flattened or embedded elsewhere
    // delete formattedContent.brands;
    // delete formattedContent.profiles;
    // delete formattedContent.content_templates;

    return NextResponse.json({ 
      success: true, 
      data: formattedContent 
    });

  } catch (error: any) {
    return handleApiError(error, `Failed to fetch content with ID: ${id}`);
  }
});

// Placeholder for PUT (update) - to be implemented as needed
export const PUT = withAuth(async (request: NextRequest, user: User, context: { params: { id: string } }) => {
  const id = context.params.id;
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();

    // Define allowed fields for update
    const allowedFields = ['title', 'body', 'meta_title', 'meta_description', 'status'];
    const updateData: Record<string, any> = {};

    // Filter request body to include only allowed fields
    for (const key of allowedFields) {
      if (body.hasOwnProperty(key)) {
        // Add specific validation if needed (e.g., for status enum)
        if (key === 'status') {
          const validStatuses: Database['public']['Enums']['content_status'][] = [
            'draft', 'pending_review', 'approved', 'published', 'rejected'
          ];
          if (!validStatuses.includes(body.status)) {
             return NextResponse.json({ success: false, error: `Invalid status value: ${body.status}` }, { status: 400 });
          }
        }
        updateData[key] = body[key];
      }
    }

    // Ensure at least one valid field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid fields provided for update. Allowed fields: title, body, meta_title, meta_description, status' 
      }, { status: 400 });
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: updatedContent, error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', id)
      .select()
      .single(); // Use single to get the updated record back

    if (error) {
      if (error.code === 'PGRST116') { // Record not found for update
        return NextResponse.json({ success: false, error: 'Content not found for update' }, { status: 404 });
      }
      console.error('Error updating content:', error);
      throw error;
    }

    if (!updatedContent) {
        // Should ideally not happen if error is null, but good practice to check
        return NextResponse.json({ success: false, error: 'Content not found after update attempt' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedContent 
    });

  } catch (error: any) {
    return handleApiError(error, `Failed to update content with ID: ${id}`);
  }
});

// Placeholder for DELETE - to be implemented as needed
// export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
//   const { id } = params;
//   // ... implementation ...
//   return NextResponse.json({ success: true, message: `Content ${id} deleted` });
// }); 