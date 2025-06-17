import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// GET handler for fetching claims workflows
export const GET = withAuth(async (req: NextRequest, user: User) => {
    try {
        if (isBuildPhase()) {
            console.log('[API Claims Workflows GET] Build phase: returning empty array.');
            return NextResponse.json({ success: true, isMockData: true, data: [] });
        }

        const supabase = createSupabaseAdminClient();
        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brand_id');

        // Build query
        let query = supabase
            .from('claims_workflows')
            .select(`
                *,
                brands(name, brand_color),
                claims_workflow_steps(
                    id,
                    step_order,
                    name,
                    description,
                    role,
                    approval_required,
                    assigned_user_ids
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Filter by brand if specified
        if (brandId) {
            query = query.eq('brand_id', brandId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API Claims Workflows GET] Error fetching workflows:', error);
            return handleApiError(error, 'Failed to fetch claims workflows');
        }

        // Format the response
        const formattedData = (data || []).map(workflow => ({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            brand_id: workflow.brand_id,
            brand_name: workflow.brands?.name || '',
            brand_color: workflow.brands?.brand_color || null,
            steps: workflow.claims_workflow_steps || [],
            steps_count: workflow.claims_workflow_steps?.length || 0,
            created_at: workflow.created_at,
            updated_at: workflow.updated_at,
            created_by: workflow.created_by
        }));

        return NextResponse.json({ 
            success: true, 
            data: formattedData 
        });

    } catch (error: unknown) {
        console.error('[API Claims Workflows GET] Caught error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching claims workflows.');
    }
});

// POST handler for creating new claims workflow
export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { name, description, brand_id, is_active = true, steps } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one workflow step is required' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();

        // Check if user has admin role (platform or scoped)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { success: false, error: 'User profile not found' },
                { status: 403 }
            );
        }

        // Check if user is admin (simplified check - you may want to add more specific role checking)
        const userMetadata = user.user_metadata || {};
        if (userMetadata.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to create claims workflows' },
                { status: 403 }
            );
        }

        // Create the workflow
        const workflowData: any = {
            name,
            description,
            created_by: user.id,
            is_active
        };

        // Only add brand_id if provided
        if (brand_id) {
            workflowData.brand_id = brand_id;
        }

        const { data: workflow, error: workflowError } = await supabase
            .from('claims_workflows')
            .insert(workflowData)
            .select()
            .single();

        if (workflowError) {
            console.error('[API Claims Workflows POST] Error creating workflow:', workflowError);
            return handleApiError(workflowError, 'Failed to create claims workflow');
        }

        // Create the workflow steps
        const stepsToInsert = steps.map((step: any, index: number) => ({
            workflow_id: workflow.id,
            step_order: index + 1,
            name: step.name,
            description: step.description,
            role: step.role,
            approval_required: step.approval_required ?? true,
            assigned_user_ids: step.assigned_user_ids || []
        }));

        const { error: stepsError } = await supabase
            .from('claims_workflow_steps')
            .insert(stepsToInsert);

        if (stepsError) {
            // Rollback workflow creation on steps error
            await supabase
                .from('claims_workflows')
                .delete()
                .eq('id', workflow.id);

            console.error('[API Claims Workflows POST] Error creating workflow steps:', stepsError);
            return handleApiError(stepsError, 'Failed to create workflow steps');
        }

        // Fetch the complete workflow with steps
        const { data: completeWorkflow } = await supabase
            .from('claims_workflows')
            .select(`
                *,
                brands(name, brand_color),
                claims_workflow_steps(
                    id,
                    step_order,
                    name,
                    description,
                    role,
                    approval_required,
                    assigned_user_ids
                )
            `)
            .eq('id', workflow.id)
            .single();

        return NextResponse.json({
            success: true,
            workflow: completeWorkflow
        });

    } catch (error: unknown) {
        console.error('[API Claims Workflows POST] Caught error:', error);
        return handleApiError(error, 'An unexpected error occurred while creating claims workflow.');
    }
});