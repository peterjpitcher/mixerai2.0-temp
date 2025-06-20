import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
// import { Database } from '@/types/supabase'; // TODO: Uncomment when supabase types are generated
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

interface ContentVersionWithReviewer {
  id: string;
  content_id: string;
  workflow_step_identifier: string;
  step_name: string | null;
  version_number: number;
  content_json: unknown; // Or a more specific type if known for content_json
  action_status: string;
  feedback: string | null;
  reviewer_id: string | null;
  created_at: string;
  reviewer: { 
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const GET = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const { id } = params;

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

    // Step 1.5: Fetch content versions
    let versions: ContentVersionWithReviewer[] = [];
    const { data: versionData, error: versionError } = await supabase
      .from('content_versions')
      .select(`
        *,
        reviewer:reviewer_id (full_name, avatar_url)
      `)
      .eq('content_id', id)
      .order('created_at', { ascending: false });

    if (versionError) {
      console.error(`Error fetching versions for content ${id}:`, versionError);
      // Decide if this is a critical error or if we can proceed without versions
      // For now, we'll proceed and versions will be an empty array
      versions = []; // Ensure versions is an empty array on error
    } else {
      versions = (versionData as ContentVersionWithReviewer[]) || []; // Explicit cast
      console.log(`[API /content/${id}] Fetched versions:`, JSON.stringify(versions, null, 2)); // Log fetched versions
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

          const assigneeProfilesMap = new Map<string, AssigneeProfile>();
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
      workflow: workflowDataWithSteps, // Embed the workflow with its steps and assignees
      versions: versions // Add versions to the response
    };
    
    console.log(`[API /content/${id}] Returning formattedContent with versions:`, JSON.stringify(formattedContent.versions, null, 2)); // Log versions being returned

    // Optionally remove original nested objects if they are fully flattened or embedded elsewhere
    // delete formattedContent.brands;
    // delete formattedContent.profiles;
    // delete formattedContent.content_templates;

    return NextResponse.json({ 
      success: true, 
      data: formattedContent 
    });

  } catch (error: unknown) {
    return handleApiError(error, `Failed to fetch content with ID: ${id}`);
  }
});

export const PUT = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const id = params.id;
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();

    // --- Permission Check Start ---
    const globalRole = user?.user_metadata?.role;

    // Fetch the content item to check its brand_id and status for permission validation
    const { data: currentContent, error: fetchError } = await supabase
      .from('content')
      .select('brand_id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
      }
      console.error('[API Content PUT] Error fetching content for permission check:', fetchError);
      return handleApiError(fetchError, 'Failed to verify content existence');
    }

    if (!currentContent) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    // Check if content is approved or published - if so, prevent editing
    if (currentContent.status === 'approved' || currentContent.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit content that has been approved or published. The content must be reopened through the workflow to make changes.' },
        { status: 403 }
      );
    }

    const targetBrandId = currentContent.brand_id;

    // Ensure brand_id is present before proceeding with permission checks
    if (!targetBrandId) {
      console.error(`[API Content PUT] Content item ${id} is missing brand_id. This is an unexpected state.`);
      return NextResponse.json(
        { success: false, error: 'Cannot update content: Content is not associated with a brand.' },
        { status: 500 } // Internal Server Error, as this indicates a data integrity issue
      );
    }

    if (globalRole !== 'admin') {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id, role')
        .eq('user_id', user.id)
        .eq('brand_id', targetBrandId);

      if (permissionsError) {
        console.error('[API Content PUT] Error fetching brand permissions for user:', user.id, targetBrandId, permissionsError);
        return handleApiError(permissionsError, 'Failed to verify user permissions');
      }

      const specificBrandPermission = permissionsData?.[0];

      if (!specificBrandPermission || !['admin', 'editor'].includes(specificBrandPermission.role)) {
        console.warn(`[API Content PUT] User ${user.id} (global role: ${globalRole}, brand role: ${specificBrandPermission?.role}) access denied to update content ${id} for brand ${targetBrandId}.`);
        return NextResponse.json(
          { success: false, error: 'You do not have permission to update this content.' },
          { status: 403 }
        );
      }
      console.log(`[API Content PUT] User ${user.id} (brand role: ${specificBrandPermission.role}) has permission to update content ${id} for brand ${targetBrandId}.`);
    } else {
      console.log(`[API Content PUT] Global admin ${user.id} updating content ${id} for brand ${targetBrandId}.`);
    }
    // --- Permission Check End ---

    // Log incoming body
    console.log('[API PUT /api/content/[id]] Received body (stringified):', JSON.stringify(body, null, 2));

    // Define allowed fields for update
    const allowedFields = ['title', 'body', 'meta_title', 'meta_description', 'status', 'content_data', 'due_date'];
    const updateData: Record<string, unknown> = {};

    // Filter request body to include only allowed fields
    for (const key of allowedFields) {
      if (body.hasOwnProperty(key)) {
        // Add specific validation if needed (e.g., for status enum)
        if (key === 'status') {
          const validStatuses: string[] = [ // TODO: Type as Database['public']['Enums']['content_status'][] when types are generated
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
        error: 'No valid fields provided for update. Allowed fields: title, body, meta_title, meta_description, status, content_data, due_date' 
      }, { status: 400 });
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Log data being sent to Supabase for update
    console.log('[API PUT /api/content/[id]] Data for Supabase update (stringified):', JSON.stringify(updateData, null, 2));

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

    // Log content returned from Supabase after update
    console.log('[API PUT /api/content/[id]] Content returned from Supabase after update (stringified):', JSON.stringify(updatedContent, null, 2));

    if (!updatedContent) {
        // Should ideally not happen if error is null, but good practice to check
        return NextResponse.json({ success: false, error: 'Content not found after update attempt' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedContent 
    });

  } catch (error: unknown) {
    return handleApiError(error, `Failed to update content with ID: ${id}`);
  }
});

export const DELETE = withAuth(async (request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const globalRole = user?.user_metadata?.role;

    // Fetch the content item to check its brand_id for permission validation
    const { data: currentContent, error: fetchError } = await supabase
      .from('content')
      .select('id, brand_id') // Select id as well for logging or if needed
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
      }
      console.error('[API Content DELETE] Error fetching content for permission check:', fetchError);
      return handleApiError(fetchError, 'Failed to verify content existence for deletion');
    }

    if (!currentContent) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
    }

    const targetBrandId = currentContent.brand_id;

    if (!targetBrandId) {
      console.error(`[API Content DELETE] Content item ${id} is missing brand_id. Cannot perform delete operation.`);
      return NextResponse.json(
        { success: false, error: 'Cannot delete content: Content is not associated with a brand.' },
        { status: 500 }
      );
    }

    // Permission check
    if (globalRole !== 'admin') {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id, role')
        .eq('user_id', user.id)
        .eq('brand_id', targetBrandId)
        .single(); // Assuming one permission record per user per brand

      if (permissionsError) {
        if (permissionsError.code === 'PGRST116') { // No rows found
          console.warn(`[API Content DELETE] User ${user.id} has no specific permissions for brand ${targetBrandId}.`);
          return NextResponse.json(
            { success: false, error: 'You do not have permission to delete this content.' },
            { status: 403 }
          );
        }
        console.error('[API Content DELETE] Error fetching brand permissions for user:', user.id, targetBrandId, permissionsError);
        return handleApiError(permissionsError, 'Failed to verify user permissions for content deletion');
      }

      const brandRole = permissionsData?.role;

      if (!brandRole || brandRole !== 'admin') { // Changed 'admin' to 'admin'
        console.warn(`[API Content DELETE] User ${user.id} (global role: ${globalRole}, brand role: ${brandRole}) access denied to delete content ${id} for brand ${targetBrandId}.`);
        return NextResponse.json(
          { success: false, error: 'You do not have permission to delete this content.' },
          { status: 403 }
        );
      }
      console.log(`[API Content DELETE] User ${user.id} (brand role: ${brandRole}) has permission to delete content ${id} for brand ${targetBrandId}.`);
    } else {
      console.log(`[API Content DELETE] Global admin ${user.id} deleting content ${id} for brand ${targetBrandId}.`);
    }

    // Perform the delete operation
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API Content DELETE] Error deleting content:', deleteError);
      return handleApiError(deleteError, `Failed to delete content with ID: ${id}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Content deleted successfully' 
    });

  } catch (error: unknown) {
    return handleApiError(error, `Failed to delete content with ID: ${id}`);
  }
});

// Placeholder for DELETE - to be implemented as needed
// export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user) => {
//   const { id } = params;
//   // ... implementation ...
//   return NextResponse.json({ success: true, message: `Content ${id} deleted` });
// }); 