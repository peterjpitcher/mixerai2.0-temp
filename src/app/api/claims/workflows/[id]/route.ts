import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// GET handler for fetching a single claims workflow
export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    try {
        const { id } = params;
        const supabase = createSupabaseAdminClient();

        const { data, error } = await supabase
            .from('claims_workflows' as never)
            .select(`
                *,
                claims_workflow_steps(
                    id,
                    step_order,
                    name,
                    description,
                    role,
                    assigned_user_ids
                )
            ` as never)
            .eq('id', id)
            .single();

        if (error) {
            console.error('[API Claims Workflow GET] Error fetching workflow:', error);
            return handleApiError(error, 'Failed to fetch claims workflow');
        }

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Claims workflow not found' },
                { status: 404 }
            );
        }

        // Get user details for assigned users
        const workflowData = data as Record<string, unknown>;
        if (workflowData.claims_workflow_steps && Array.isArray(workflowData.claims_workflow_steps) && workflowData.claims_workflow_steps.length > 0) {
            const allUserIds = (workflowData.claims_workflow_steps as Array<Record<string, unknown>>)
                .flatMap((step) => (step.assigned_user_ids as string[]) || [])
                .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index);

            if (allUserIds.length > 0) {
                const { data: users, error: usersError } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', allUserIds);

                if (!usersError && users) {
                    // Map users to each step
                    (workflowData.claims_workflow_steps as Array<Record<string, unknown>>).forEach((step) => {
                        step.assigned_users = ((step.assigned_user_ids as string[]) || []).map((userId: string) => {
                            const user = users.find(u => u.id === userId);
                            return user || { id: userId, email: 'Unknown', full_name: null };
                        });
                    });
                }
            }
        }

        // Count claims using this workflow
        const { count: claimsCount } = await supabase
            .from('claims')
            .select('id', { count: 'exact', head: true })
            .eq('workflow_id', id);

        // Sort steps by order
        workflowData.steps = (workflowData.claims_workflow_steps as Array<Record<string, unknown>>)
            ?.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.step_order as number) - (b.step_order as number)) || [];
        delete workflowData.claims_workflow_steps;

        workflowData.claims_count = claimsCount || 0;

        return NextResponse.json({ 
            success: true, 
            data: workflowData 
        });

    } catch (error: unknown) {
        console.error('[API Claims Workflow GET] Caught error:', error);
        return handleApiError(error, 'An unexpected error occurred while fetching claims workflow.');
    }
});

// PUT handler for updating a claims workflow
export const PUT = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    try {
        const { id } = params;
        const body = await req.json();
        const { name, description, steps } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseAdminClient();

        // Check if user has admin permission for the workflow's brand
        const { data: workflow } = await supabase
            .from('claims_workflows' as never)
            .select('brand_id')
            .eq('id', id)
            .single();

        if (!workflow) {
            return NextResponse.json(
                { success: false, error: 'Claims workflow not found' },
                { status: 404 }
            );
        }

        // For now, skip brand permission check as claims workflows might not be brand-specific
        // This can be re-enabled when brand_id is added to claims_workflows table

        // Update the workflow
        const { error: updateError } = await supabase
            .from('claims_workflows' as never)
            .update({
                name,
                description,
                updated_at: new Date().toISOString()
            } as never)
            .eq('id', id);

        if (updateError) {
            console.error('[API Claims Workflow PUT] Error updating workflow:', updateError);
            return handleApiError(updateError, 'Failed to update claims workflow');
        }

        // Update steps if provided
        if (steps && Array.isArray(steps)) {
            // Delete existing steps
            await supabase
                .from('claims_workflow_steps' as never)
                .delete()
                .eq('workflow_id', id);

            // Insert new steps
            const stepsToInsert = steps.map((step: Record<string, unknown>, index: number) => ({
                workflow_id: id,
                step_order: index + 1,
                name: step.name,
                description: step.description,
                role: step.role,
                approval_required: step.approval_required ?? true,
                assigned_user_ids: step.assigned_user_ids || []
            }));

            const { error: stepsError } = await supabase
                .from('claims_workflow_steps' as never)
                .insert(stepsToInsert as never);

            if (stepsError) {
                console.error('[API Claims Workflow PUT] Error updating workflow steps:', stepsError);
                return handleApiError(stepsError, 'Failed to update workflow steps');
            }
        }

        // Fetch the updated workflow
        const { data: updatedWorkflow } = await supabase
            .from('claims_workflows' as never)
            .select(`
                *,
                claims_workflow_steps(
                    id,
                    step_order,
                    name,
                    description,
                    role,
                    assigned_user_ids
                )
            `)
            .eq('id', id)
            .single();

        return NextResponse.json({
            success: true,
            data: updatedWorkflow
        });

    } catch (error: unknown) {
        console.error('[API Claims Workflow PUT] Caught error:', error);
        return handleApiError(error, 'An unexpected error occurred while updating claims workflow.');
    }
});

// DELETE handler for deleting a claims workflow
export const DELETE = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
    const { params } = context as { params: { id: string } };
    try {
        const { id } = params;
        const supabase = createSupabaseAdminClient();

        // Check if user has admin permission for the workflow's brand
        const { data: workflow } = await supabase
            .from('claims_workflows' as never)
            .select('brand_id')
            .eq('id', id)
            .single();

        if (!workflow) {
            return NextResponse.json(
                { success: false, error: 'Claims workflow not found' },
                { status: 404 }
            );
        }

        // For now, skip brand permission check as claims workflows might not be brand-specific
        // This can be re-enabled when brand_id is added to claims_workflows table

        // Check if any claims are using this workflow
        const { data: claimsUsingWorkflow } = await supabase
            .from('claims')
            .select('id')
            .eq('workflow_id', id)
            .limit(1);

        if (claimsUsingWorkflow && claimsUsingWorkflow.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete workflow that is being used by claims' },
                { status: 400 }
            );
        }

        // Delete the workflow (steps will be cascade deleted)
        const { error: deleteError } = await supabase
            .from('claims_workflows' as never)
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[API Claims Workflow DELETE] Error deleting workflow:', deleteError);
            return handleApiError(deleteError, 'Failed to delete claims workflow');
        }

        return NextResponse.json({
            success: true,
            message: 'Claims workflow deleted successfully'
        });

    } catch (error: unknown) {
        console.error('[API Claims Workflow DELETE] Caught error:', error);
        return handleApiError(error, 'An unexpected error occurred while deleting claims workflow.');
    }
});