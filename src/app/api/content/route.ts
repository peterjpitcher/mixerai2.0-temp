import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { Database, TablesInsert, Enums } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

// Define the specific type for content status using Enums if available, or define manually
type ContentStatus = Enums<"content_status">;

const VALID_STATUSES: ContentStatus[] = ['draft', 'pending_review', 'approved', 'published', 'rejected', 'cancelled'];

/**
 * GET: Retrieve all content, optionally filtered by a search query.
 * Joined with brand, content type, and creator details.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const requestedBrandId = url.searchParams.get('brandId');
    const requestedStatusParam = url.searchParams.get('status'); // 'active', 'approved', 'rejected', 'all', or a direct status value
    const globalRole = user?.user_metadata?.role;
    let permittedBrandIds: string[] | null = null;

    if (globalRole !== 'admin') {
      // Fetch brand_permissions directly for the user
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', user.id);

      if (permissionsError) {
        console.error('[API Content GET] Error fetching brand permissions for user:', user.id, permissionsError);
        // Optionally, re-throw or handle as a critical error
        return handleApiError(permissionsError, 'Failed to fetch user brand permissions');
      }

      if (!permissionsData || permissionsData.length === 0) {
        console.log('[API Content GET] Non-admin user has no brand permissions in user_brand_permissions table. Returning empty array.');
        return NextResponse.json({ success: true, data: [] });
      }
      
      permittedBrandIds = permissionsData.map(p => p.brand_id).filter(id => id != null);
      
      if (permittedBrandIds.length === 0) {
        console.log('[API Content GET] Non-admin user has no valid brand IDs after fetching permissions. Returning empty array.');
        return NextResponse.json({ success: true, data: [] });
      }
      console.log(`[API Content GET] User ${user.id} (role: ${globalRole}) has permitted brand IDs: ${permittedBrandIds.join(', ')}`);
    }

    let queryBuilder = supabase
      .from('content')
      .select(`
        *,
        brands ( name, brand_color ),
        content_types ( name ),
        creator_profile:profiles!created_by ( full_name, avatar_url ),
        content_templates ( name, icon ),
        current_step_details:workflow_steps!current_step ( name )
      `)
      .order('updated_at', { ascending: false });

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,meta_description.ilike.%${query}%`);
    }

    if (requestedBrandId) {
      if (globalRole !== 'admin' && permittedBrandIds && !permittedBrandIds.includes(requestedBrandId)) {
        console.log(`[API Content GET] Non-admin user access denied for requested brandId: ${requestedBrandId}`);
        return NextResponse.json({ success: true, data: [] }); // Or return 403 error
      }
      console.log(`[API Content GET] Filtering by requested brandId: ${requestedBrandId}`);
      queryBuilder = queryBuilder.eq('brand_id', requestedBrandId);
    } else if (globalRole !== 'admin' && permittedBrandIds) {
      // If no specific brand requested, and user is not admin, filter by their permitted brands
      console.log(`[API Content GET] Non-admin user. Filtering content by permitted brand IDs: ${permittedBrandIds.join(', ')}`);
      queryBuilder = queryBuilder.in('brand_id', permittedBrandIds);
    } else if (globalRole === 'admin') {
      console.log('[API Content GET] Admin user. Fetching all content (or specific brand if requestedBrandId set).');
      // Admins can see all, or specific if requestedBrandId is set (handled by the first if block)
    }

    // Status filtering logic
    const activeStatuses: ContentStatus[] = ['draft', 'pending_review'];
    
    if (requestedStatusParam) {
      const lowerCaseStatus = requestedStatusParam.toLowerCase();
      if (lowerCaseStatus === 'active') {
        queryBuilder = queryBuilder.in('status', activeStatuses);
      } else if (lowerCaseStatus === 'all') {
        // No status filter
      } else if (VALID_STATUSES.includes(lowerCaseStatus as ContentStatus)) {
        queryBuilder = queryBuilder.eq('status', lowerCaseStatus as ContentStatus);
      } else {
        // Invalid status parameter, default to active or return error
        console.warn(`Invalid status parameter received: ${requestedStatusParam}. Defaulting to active content.`);
        queryBuilder = queryBuilder.in('status', activeStatuses);
      }
    } else {
      // Default to active statuses if no specific status is requested
      queryBuilder = queryBuilder.in('status', activeStatuses);
    }

    const { data: contentItems, error: contentError } = await queryBuilder;

    if (contentError) {
      console.error('Error fetching content:', contentError);
      throw contentError;
    }

    // Step 1: Collect all unique assignee IDs from all content items
    const allAssigneeIds = new Set<string>();
    (contentItems || []).forEach(item => {
      if (item.assigned_to && Array.isArray(item.assigned_to)) {
        item.assigned_to.forEach((id: string) => id && allAssigneeIds.add(id));
      }
    });

    // Step 2: Fetch all relevant profiles in one go
    let assigneeProfilesMap = new Map<string, { full_name: string | null, avatar_url: string | null }>();
    if (allAssigneeIds.size > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allAssigneeIds));

      if (profilesError) {
        console.error('Error fetching assignee profiles:', profilesError);
        // Continue without assignee names if this fails, or throw error
      } else if (profilesData) {
        profilesData.forEach(profile => {
          assigneeProfilesMap.set(profile.id, { full_name: profile.full_name, avatar_url: profile.avatar_url });
        });
      }
    }

    const workflowDataWithSteps = await Promise.all(
      (contentItems || []).map(async (item) => {
        if (item.workflow_id) {
          const { data: workflow, error: workflowError } = await supabase
            .from('workflows')
            .select('id, name')
            .eq('id', item.workflow_id)
            .single();

          if (workflowError) {
            console.error(`Error fetching workflow ${item.workflow_id} for content ${item.id}:`, workflowError);
            return null;
          }

          const { data: steps, error: stepsError } = await supabase
            .from('workflow_steps')
            .select('id, name, description, step_order, role, approval_required, assigned_user_ids')
            .eq('workflow_id', item.workflow_id)
            .order('step_order', { ascending: true });

          if (stepsError) {
            console.error(`Error fetching steps for workflow ${item.workflow_id}:`, stepsError);
            return { ...workflow, steps: [] }; // Return workflow data even if steps fail
          }
          return { ...workflow, steps };
        }
        return null;
      })
    );

    const formattedContent = (contentItems || []).map((item, index) => {
      let firstAssignedId: string | null = null;
      const assigneeNames: string[] = [];
      if (item.assigned_to && Array.isArray(item.assigned_to) && item.assigned_to.length > 0) {
        firstAssignedId = (item.assigned_to as string[])[0]; // Keep for assigned_to_id if needed
        item.assigned_to.forEach((id: string) => {
          if (id) {
            const profile = assigneeProfilesMap.get(id);
            if (profile && profile.full_name) {
              assigneeNames.push(profile.full_name);
            }
          }
        });
      }

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        brand_id: item.brand_id,
        brand_name: item.brands?.name || null,
        brand_color: item.brands?.brand_color || null,
        content_type_id: item.content_type_id,
        content_type_name: item.content_types?.name || null,
        created_by: item.created_by,
        created_by_name: item.creator_profile?.full_name || null,
        creator_avatar_url: item.creator_profile?.avatar_url || null,
        template_id: item.template_id,
        template_name: item.content_templates?.name || null,
        template_icon: item.content_templates?.icon || null,
        workflow_id: item.workflow_id,
        current_step_id: item.current_step,
        current_step_name: item.current_step_details?.name || (item.current_step ? 'Step not found' : 'N/A'),
        assigned_to_id: firstAssignedId, // This still shows the first ID
        assigned_to_name: assigneeNames.length > 0 ? assigneeNames.join(', ') : 'N/A',
        assigned_to: item.assigned_to || null, // Ensure the raw assigned_to array is included
        workflow: workflowDataWithSteps[index]
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedContent,
    });

  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch content');
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const data = await request.json();
    
    if (!data.brand_id || !data.title || !data.body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();

    let assignedToUsersForContent: string[] | null = null;
    let currentWorkflowStepId: string | null = null;

    if (data.workflow_id) {
      const { data: workflowFirstStep, error: workflowStepError } = await supabase
        .from('workflow_steps')
        .select('id, assigned_user_ids, step_order')
        .eq('workflow_id', data.workflow_id)
        .order('step_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workflowStepError) {
        console.error('Error fetching first workflow step:', workflowStepError);
        throw workflowStepError;
      }

      if (workflowFirstStep) {
        currentWorkflowStepId = workflowFirstStep.id;
        if (workflowFirstStep.assigned_user_ids && Array.isArray(workflowFirstStep.assigned_user_ids) && workflowFirstStep.assigned_user_ids.length > 0) {
          assignedToUsersForContent = workflowFirstStep.assigned_user_ids;
        }
      }
    }

    const newContentPayload: TablesInsert<'content'> = {
      brand_id: data.brand_id,
      title: data.title,
      body: data.body,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      content_type_id: data.content_type_id || null,
      template_id: data.template_id || null,
      created_by: user.id,
      workflow_id: data.workflow_id || null,
      current_step: currentWorkflowStepId,
      assigned_to: assignedToUsersForContent,
      status: data.status || 'draft',
      content_data: data.content_data || {}
    };

    const { data: newContentData, error: newContentError } = await supabase
      .from('content')
      .insert(newContentPayload)
      .select()
      .single();

    if (newContentError) {
      console.error('Error inserting new content:', newContentError);
      throw newContentError;
    }

    return NextResponse.json({ success: true, data: newContentData });
  } catch (error) {
    return handleApiError(error);
  }
}); 