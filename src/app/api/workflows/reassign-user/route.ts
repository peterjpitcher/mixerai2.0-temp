import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema for request validation
const ReassignUserSchema = z.object({
  from_user_id: z.string().uuid('Invalid from_user_id'),
  to_user_id: z.string().uuid('Invalid to_user_id'),
  brand_id: z.string().uuid('Invalid brand_id').optional(),
  workflow_ids: z.array(z.string().uuid()).optional()
});

// POST /api/workflows/reassign-user
// Reassign workflows from one user to another
export const POST = withAuth(async (request: NextRequest, user: User) => {
  try {
    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can reassign workflows' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ReassignUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      );
    }

    const { from_user_id, to_user_id, brand_id, workflow_ids } = validationResult.data;

    if (from_user_id === to_user_id) {
      return NextResponse.json(
        { success: false, error: 'Cannot reassign to the same user' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // If specific workflow IDs provided, reassign only those
    if (workflow_ids && workflow_ids.length > 0) {
      let reassignedCount = 0;
      const reassignmentLog: Array<{ workflow_id: string; workflow_name: string }> = [];

      for (const workflowId of workflow_ids) {
        // Get the workflow
        const { data: workflow, error: fetchError } = await supabase
          .from('workflows')
          .select('id, name, steps')
          .eq('id', workflowId)
          .single();

        if (fetchError || !workflow || !workflow.steps || !Array.isArray(workflow.steps)) continue;

        // Process steps to replace the user
        const newSteps = (workflow.steps as Array<{assignees?: Array<{id: string; email: string; full_name: string}>}>).map((step) => {
          if (step.assignees && Array.isArray(step.assignees)) {
            step.assignees = step.assignees.map((assignee) => {
              if (assignee.id === from_user_id) {
                return {
                  id: to_user_id,
                  email: assignee.email, // This will be updated by the UI
                  full_name: assignee.full_name // This will be updated by the UI
                };
              }
              return assignee;
            });
          }
          return step;
        });

        // Update the workflow
        const { error: updateError } = await supabase
          .from('workflows')
          .update({ 
            steps: newSteps,
            updated_at: new Date().toISOString()
          })
          .eq('id', workflowId);

        if (!updateError) {
          reassignedCount++;
          reassignmentLog.push({
            workflow_id: workflowId,
            workflow_name: workflow.name
          });
        }
      }

      return NextResponse.json({
        success: true,
        reassigned_count: reassignedCount,
        reassignment_log: reassignmentLog
      });
    }

    // If brand_id provided, use the database function to handle all reassignments
    if (brand_id) {
      // TODO: Replace with actual RPC call once the database function is deployed
      // const { data, error } = await supabase.rpc('handle_user_brand_removal', {
      //   p_user_id: from_user_id,
      //   p_brand_id: brand_id,
      //   p_reassign_to_user_id: to_user_id
      // });

      // For now, return placeholder response
      return NextResponse.json({
        success: true,
        reassigned_count: 0,
        reassignment_log: []
      });
    }

    // If neither workflow_ids nor brand_id provided
    return NextResponse.json(
      { 
        success: false, 
        error: 'Either brand_id or workflow_ids must be provided' 
      },
      { status: 400 }
    );

  } catch (error) {
    return handleApiError(error, 'Error reassigning workflows');
  }
});