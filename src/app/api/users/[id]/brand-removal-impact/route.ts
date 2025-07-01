import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// GET /api/users/[id]/brand-removal-impact?brand_id=[brandId]
// Check the impact of removing a user from a brand
export const GET = withAuth(async (request: NextRequest, user: any, context?: unknown) => {
  try {
    const { params } = context as { params: { id: string } };
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brand_id parameter is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const isGlobalAdmin = user.user_metadata?.role === 'admin';
    if (!isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can check removal impact' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // TODO: Replace with actual RPC call once the database function is deployed
    // const { data, error } = await supabase.rpc('check_user_workflow_assignments', {
    //   p_user_id: params.id,
    //   p_brand_id: brandId
    // });

    // For now, return placeholder data
    const data = {
      workflow_count: 0,
      content_count: 0,
      total_assignments: 0,
      affected_workflows: [],
      affected_content: []
    };

    // Get user and brand details for better context
    const [userResult, brandResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', params.id)
        .single(),
      supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single()
    ]);

    return NextResponse.json({
      success: true,
      user: {
        id: params.id,
        full_name: userResult.data?.full_name,
        email: userResult.data?.email
      },
      brand: {
        id: brandId,
        name: brandResult.data?.name
      },
      impact: {
        workflow_count: data.workflow_count || 0,
        content_count: data.content_count || 0,
        total_assignments: data.total_assignments || 0,
        affected_workflows: data.affected_workflows || [],
        affected_content: data.affected_content || []
      },
      recommendation: data.total_assignments > 0 
        ? 'User has active assignments. Reassignment will be required.'
        : 'User has no active assignments. Safe to remove.'
    });
  } catch (error) {
    return handleApiError(error, 'Error checking brand removal impact');
  }
});