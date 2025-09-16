import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';

// GET /api/workflows/orphaned-assignments
// Find workflows with assignments to users who no longer have access to the brand
export const GET = withAuth(async (request: NextRequest, user: User) => {
  try {
    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can check for orphaned assignments' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get all active workflows
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, brand_id, steps, brands!inner(name)')
      .eq('status', 'active');

    if (workflowError) throw workflowError;

    const orphanedData: Array<{
      workflow_id: string;
      workflow_name: string;
      brand_id: string;
      brand_name: string;
      orphaned_users: Array<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>;
    }> = [];

    // Check each workflow for orphaned assignments
    for (const workflow of workflows || []) {
      const assignedUserIds = new Set<string>();
      
      // Extract all user IDs from workflow steps
      if (workflow.steps && Array.isArray(workflow.steps)) {
        (workflow.steps as unknown[]).forEach((step) => {
          const typedStep = step as {assignees?: Array<{id?: string}>};
          if (typedStep.assignees && Array.isArray(typedStep.assignees)) {
            typedStep.assignees.forEach((assignee) => {
              if (assignee.id) {
                assignedUserIds.add(assignee.id);
              }
            });
          }
        });
      }

      // Check which users don't have access to the brand
      if (assignedUserIds.size > 0 && workflow.brand_id) {
        const { data: permissions } = await supabase
          .from('user_brand_permissions')
          .select('user_id')
          .eq('brand_id', workflow.brand_id)
          .in('user_id', Array.from(assignedUserIds));

        const permittedUserIds = new Set(permissions?.map(p => p.user_id) || []);
        const orphanedUserIds = Array.from(assignedUserIds).filter(id => !permittedUserIds.has(id));

        if (orphanedUserIds.length > 0) {
          // Get user details for orphaned users
          const { data: userDetails } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', orphanedUserIds);

          orphanedData.push({
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            brand_id: workflow.brand_id,
            brand_name: (workflow.brands as {name?: string})?.name || '',
            orphaned_users: userDetails || []
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      orphaned_count: orphanedData.reduce((sum, w) => sum + w.orphaned_users.length, 0),
      workflows_with_orphans: orphanedData.length,
      details: orphanedData
    });
  } catch (error) {
    return handleApiError(error, 'Error checking orphaned assignments');
  }
});
