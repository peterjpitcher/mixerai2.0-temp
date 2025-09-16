import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { generateContentTitleFromContext } from '@/lib/azure/openai';
// import { TablesInsert, Enums } from '@/types/supabase'; // TODO: Uncomment when types are regenerated
import { User } from '@supabase/supabase-js';

// Define the specific type for content status using Enums if available, or define manually
type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'cancelled'; // TODO: Use Enums<"content_status"> when types are regenerated

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
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit)); // Cap at 100 items per page
    const offset = (validatedPage - 1) * validatedLimit;
    
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
        brands ( name, brand_color, logo_url ),
        content_types ( name ),
        creator_profile:profiles!created_by ( id, full_name, avatar_url ),
        content_templates ( name, icon ),
        current_step_details:workflow_steps!current_step ( name )
      `, { count: 'exact' })
      .order('updated_at', { ascending: false });

    if (query) {
      // Escape special characters to prevent SQL injection
      const escapedQuery = query.replace(/[%_]/g, '\\$&');
      queryBuilder = queryBuilder.or(`title.ilike.%${escapedQuery}%,meta_description.ilike.%${escapedQuery}%`);
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

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + validatedLimit - 1);
    
    const { data: contentItems, error: contentError, count } = await queryBuilder;

    if (contentError) {
      console.error('Error fetching content:', contentError);
      throw contentError;
    }

    // Step 1: Collect all unique creator and assignee IDs
    const userIdsForAuthCheck = new Set<string>();
    (contentItems || []).forEach(item => {
      if (item.creator_profile?.id) {
        // Only add if profile avatar_url is likely missing, to optimize if needed later
        // For now, adding all to fetch auth data as a fallback regardless
        userIdsForAuthCheck.add(item.creator_profile.id);
      }
      if (item.assigned_to && Array.isArray(item.assigned_to)) {
        item.assigned_to.forEach((id: string) => {
          if (id) userIdsForAuthCheck.add(id);
        });
      }
    });
    
    // Step 2: Fetch all auth users in a single call to build the avatar map
    const authAvatarsMap = new Map<string, string | null>();
    const { data: { users: allAuthUsers }, error: allUsersError } = await supabase.auth.admin.listUsers();

    if (allUsersError) {
      console.error('Error fetching all auth users:', allUsersError);
      // Not a fatal error, we can proceed without the auth avatars
    } else {
      const relevantAuthUsers = allAuthUsers.filter(u => userIdsForAuthCheck.has(u.id));
      for (const authUser of relevantAuthUsers) {
        if (authUser.user_metadata && typeof authUser.user_metadata === 'object' && 'avatar_url' in authUser.user_metadata) {
          const authAvatar = (authUser.user_metadata as Record<string, unknown>).avatar_url;
          if (typeof authAvatar === 'string' && authAvatar.trim() !== '') {
            authAvatarsMap.set(authUser.id, authAvatar);
          }
        }
      }
    }

    // Step 3: Fetch assignee profiles (already existing logic, slightly adjusted for context)
    const allAssigneeIdsFromContent = new Set<string>();
    (contentItems || []).forEach(item => {
      if (item.assigned_to && Array.isArray(item.assigned_to)) {
        item.assigned_to.forEach((id: string) => {
          if (id) allAssigneeIdsFromContent.add(id);
        });
      }
    });

    const assigneeProfilesMap = new Map<string, { id: string, full_name: string | null, avatar_url: string | null }>();
    if (allAssigneeIdsFromContent.size > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url') // ensure 'id' is selected
        .in('id', Array.from(allAssigneeIdsFromContent));

      if (profilesError) {
        console.error('Error fetching assignee profiles:', profilesError);
      } else if (profilesData) {
        profilesData.forEach(profile => {
          assigneeProfilesMap.set(profile.id, { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url });
        });
      }
    }

    // --- N+1 FIX: Efficiently fetch all required workflows and their steps ---
    const workflowIds = (contentItems || []).map(item => item.workflow_id).filter((id): id is string => !!id);
    const workflowsMap = new Map<string, { id: string; name: string; steps: unknown[] }>();

    if (workflowIds.length > 0) {
      // Fetch all relevant workflows
      const { data: workflowsData, error: workflowsError } = await supabase
        .from('workflows')
        .select('id, name')
        .in('id', workflowIds);

      // Fetch all relevant steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('id, name, description, step_order, role, approval_required, assigned_user_ids, workflow_id')
        .in('workflow_id', workflowIds)
        .order('step_order', { ascending: true });

      if (workflowsError) throw workflowsError;
      if (stepsError) throw stepsError;

      // Populate the map with workflows
      (workflowsData || []).forEach(wf => {
        workflowsMap.set(wf.id, { ...wf, steps: [] });
      });

      // Populate the workflows in the map with their steps
      (stepsData || []).forEach(step => {
        const workflow = workflowsMap.get(step.workflow_id);
        if (workflow) {
          workflow.steps.push(step);
        }
      });
    }
    // --- END N+1 FIX ---

    const formattedContent = (contentItems || []).map((item) => {
      let firstAssignedId: string | null = null;
      const assigneeNames: string[] = [];
      // let firstAssigneeAvatarUrl: string | null = null; // Will be determined with new logic

      if (item.assigned_to && Array.isArray(item.assigned_to) && item.assigned_to.length > 0) {
        firstAssignedId = (item.assigned_to as string[])[0];
        item.assigned_to.forEach((id: string) => {
          if (id) {
            const profile = assigneeProfilesMap.get(id);
            if (profile && profile.full_name) {
              assigneeNames.push(profile.full_name);
            }
            // firstAssigneeAvatarUrl logic will be handled below
          }
        });
      }
      
      // Determine Creator Avatar URL
      let finalCreatorAvatarUrl: string | null = null;
      if (item.creator_profile) {
        finalCreatorAvatarUrl = item.creator_profile.avatar_url || null; // From profiles table
        if (!finalCreatorAvatarUrl && item.creator_profile.id) {
          finalCreatorAvatarUrl = authAvatarsMap.get(item.creator_profile.id) || null; // From auth.users metadata
        }
        if (!finalCreatorAvatarUrl && item.creator_profile.id) { // Fallback to DiceBear
          finalCreatorAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.creator_profile.id}`;
        }
      }

      // Determine First Assignee Avatar URL
      let finalAssigneeAvatarUrl: string | null = null;
      if (firstAssignedId) {
        const assigneeProfile = assigneeProfilesMap.get(firstAssignedId);
        finalAssigneeAvatarUrl = assigneeProfile?.avatar_url || null; // From profiles table
        if (!finalAssigneeAvatarUrl) {
          finalAssigneeAvatarUrl = authAvatarsMap.get(firstAssignedId) || null; // From auth.users metadata
        }
        if (!finalAssigneeAvatarUrl) { // Fallback to DiceBear
          finalAssigneeAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstAssignedId}`;
        }
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
        brand_logo_url: item.brands?.logo_url || null,
        content_type_id: item.content_type_id,
        content_type_name: item.content_types?.name || null,
        created_by: item.created_by,
        created_by_name: item.creator_profile?.full_name || null,
        creator_avatar_url: finalCreatorAvatarUrl, // Use determined URL
        template_id: item.template_id,
        template_name: item.content_templates?.name || null,
        template_icon: item.content_templates?.icon || null,
        workflow_id: item.workflow_id,
        current_step_id: item.current_step,
        current_step_name: item.current_step_details?.name || (item.current_step ? 'Step not found' : 'N/A'),
        assigned_to_id: firstAssignedId,
        assigned_to_name: assigneeNames.length > 0 ? assigneeNames.join(', ') : 'N/A',
        assigned_to_avatar_url: finalAssigneeAvatarUrl, // Use determined URL
        assigned_to: item.assigned_to || null,
        workflow: item.workflow_id ? workflowsMap.get(item.workflow_id) || null : null
      };
    });

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / validatedLimit) : 0;
    const hasNextPage = validatedPage < totalPages;
    const hasPreviousPage = validatedPage > 1;
    
    return NextResponse.json({
      success: true,
      data: formattedContent,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });

  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch content');
  }
});

export const POST = withAuthAndCSRF(async (request: NextRequest, user: User) => {
  try {
    const data = await request.json();
    
    // brand_id and body are required inputs; title will be auto-generated if missing
    if (!data.brand_id || !data.body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    const globalRole = user.user_metadata?.role;
    const targetBrandId = data.brand_id;

    // Permission check for creating content
    if (globalRole !== 'admin') {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id, role')
        .eq('user_id', user.id)
        .eq('brand_id', targetBrandId);

      if (permissionsError) {
        console.error('[API Content POST] Error fetching brand permissions for user:', user.id, targetBrandId, permissionsError);
        return handleApiError(permissionsError, 'Failed to verify user permissions');
      }

      const specificBrandPermission = permissionsData?.[0];

      if (!specificBrandPermission || !['admin', 'editor'].includes(specificBrandPermission.role)) {
        console.warn(`[API Content POST] User ${user.id} (global role: ${globalRole}, brand role: ${specificBrandPermission?.role}) access denied to create content for brand ${targetBrandId}.`);
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create content for this brand.' },
          { status: 403 }
        );
      }
      console.log(`[API Content POST] User ${user.id} (brand role: ${specificBrandPermission.role}) has permission to create content for brand ${targetBrandId}.`);
    } else {
      console.log(`[API Content POST] Global admin ${user.id} creating content for brand ${targetBrandId}.`);
    }

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

    // Ensure we have a title: prefer provided title, else generate server-side, else safe fallback
    let finalTitle: string = (typeof data.title === 'string' ? data.title.trim() : '') || '';

    if (!finalTitle) {
      try {
        // Fetch brand context for AI title generation
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, name, brand_identity, tone_of_voice, language, country')
          .eq('id', data.brand_id)
          .single();

        if (!brandError && brandData && brandData.language && brandData.country) {
          try {
            finalTitle = await generateContentTitleFromContext(String(data.body), {
              name: brandData.name as string,
              brand_identity: brandData.brand_identity as string | null,
              tone_of_voice: brandData.tone_of_voice as string | null,
              language: brandData.language as string,
              country: brandData.country as string,
            });
          } catch (aiError) {
            console.warn('[API Content POST] AI title generation failed, will use fallback:', aiError);
          }
        } else {
          if (brandError) {
            console.warn('[API Content POST] Failed to fetch brand for title generation:', brandError);
          } else {
            console.warn('[API Content POST] Brand missing language/country; skipping AI title generation');
          }
        }
      } catch (ctxError) {
        console.warn('[API Content POST] Error preparing brand context for title generation:', ctxError);
      }
    }

    if (!finalTitle) {
      // Fallback: derive a simple title from body or use a dated default
      try {
        const bodyText: string = String(data.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (bodyText.length > 0) {
          finalTitle = bodyText.slice(0, 80);
        }
      } catch {}
      if (!finalTitle) {
        const dateStr = new Date().toISOString().slice(0, 10);
        finalTitle = `Untitled Content - ${dateStr}`;
      }
    }

    const newContentPayload = { // TODO: Type as TablesInsert<'content'> when types are regenerated
      brand_id: data.brand_id,
      title: finalTitle,
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
      content_data: data.content_data || {},
    };

    const { data: newContentData, error: newContentError } = await supabase
      .from('content')
      .insert(newContentPayload)
      .select()
      .single();

    if (newContentError) {
      // Error inserting new content
      throw newContentError;
    }

    // Send email notifications to assigned users if workflow is set
    if (data.workflow_id && assignedToUsersForContent && assignedToUsersForContent.length > 0) {
      try {
        // Create user tasks for tracking
        for (const assigneeId of assignedToUsersForContent) {
          // Create task record - only if we have a workflow step ID
          if (currentWorkflowStepId) {
            const { data: newTask } = await supabase
              .from('user_tasks')
              .insert({
                user_id: assigneeId,
                content_id: newContentData.id,
                workflow_id: data.workflow_id,
                workflow_step_id: currentWorkflowStepId,
                status: 'pending',
                created_at: new Date().toISOString()
              })
              .select()
              .single();
          
            if (newTask) {
              // Send email notification using the email API endpoint
              try {
                // Get the absolute URL for the API
                const protocol = request.headers.get('x-forwarded-proto') || 'https';
                const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
                const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                
                console.log('[Email Notification] Attempting to send to user:', assigneeId);
                console.log('[Email Notification] Task ID:', newTask.id);
                console.log('[Email Notification] Content ID:', newContentData.id);
                
                const emailResponse = await fetch(`${baseUrl}/api/notifications/email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    // Forward the authorization header for the email API
                    'Authorization': request.headers.get('authorization') || '',
                    // Forward CSRF token if present
                    'x-csrf-token': request.headers.get('x-csrf-token') || ''
                  },
                  body: JSON.stringify({
                    type: 'task_assignment',
                    userId: assigneeId,
                    taskId: newTask.id,
                    contentId: newContentData.id
                  })
                });
                
                if (!emailResponse.ok) {
                  const errorText = await emailResponse.text();
                  console.error('[Email Notification] Failed with status:', emailResponse.status);
                  console.error('[Email Notification] Error response:', errorText);
                } else {
                  console.log('[Email Notification] Successfully queued for user:', assigneeId);
                }
              } catch (emailError) {
                console.error('Error sending email notification:', emailError);
                // Don't fail the content creation if email fails
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating tasks or sending notifications:', notificationError);
        // Don't fail the content creation if notifications fail
      }
    }

    return NextResponse.json({ success: true, data: newContentData });
  } catch (error) {
    return handleApiError(error);
  }
}); 
