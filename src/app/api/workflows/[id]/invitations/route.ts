import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { v4 as uuidv4 } from 'uuid';
import { verifyEmailTemplates } from '@/lib/auth/email-templates';
import { User } from '@supabase/supabase-js';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { logSecurityEvent } from '@/lib/auth/account-lockout';
import {
  BrandPermissionVerificationError,
  isPlatformAdminUser,
  requireBrandAccess,
  requireBrandAdminAccess,
} from '@/lib/auth/brand-access';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Define a generic type for steps from the database
interface AssigneeData {
  email: string;
  id?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface StepData {
  id: number;
  name: string;
  description?: string;
  role?: string;
  approvalRequired?: boolean;
  assignees?: AssigneeData[];
  [key: string]: unknown;
}

// Extract company name from email domain
const extractCompanyFromEmail = (email: string) => {
  try {
    const domain = email.split('@')[1];
    if (!domain) return '';
    
    // Remove common TLDs and extract the main domain name
    const mainDomain = domain.split('.')[0];
    
    // Capitalize the first letter of each word
    return mainDomain
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return '';
  }
};

// The context for route handlers like POST, GET should include params for dynamic routes.
// The user object is injected by withAuth wrapper.

/**
 * POST endpoint to invite users to a workflow step
 * This handles sending new invitations for users who don't yet have accounts
 */
export const POST = withAuthAndCSRF(async (request: NextRequest, user: User, context?: unknown): Promise<Response> => {
  const { params } = context as { params: { id: string } };
  try {
    const workflowId = params?.id;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: 'Workflow ID is required in path' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    if (!body.email || !body.stepId) {
      return NextResponse.json(
        { success: false, error: 'Email and step ID are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const isGlobalAdmin = isPlatformAdminUser(user);
    let workflowBrandId: string | null = null;

    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('brand_id')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    workflowBrandId = workflow.brand_id as string | null;

    if (!isGlobalAdmin) {
      if (!workflowBrandId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Workflow is not associated with a brand.' },
          { status: 403 }
        );
      }

      try {
        await requireBrandAdminAccess(supabase, user, workflowBrandId);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ADMIN_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You do not have permission to invite users for this workflow.' },
            { status: 403 }
          );
        }
        throw error;
      }
    }

    const rawStepId = typeof body.stepId === 'string' ? body.stepId.trim() : String(body.stepId ?? '').trim();
    if (!rawStepId) {
      return NextResponse.json(
        { success: false, error: 'A valid step ID is required.' },
        { status: 400 }
      );
    }

    const { data: stepById, error: stepByIdError } = await supabase
      .from('workflow_steps')
      .select('id, name, role, step_id')
      .eq('workflow_id', workflowId)
      .eq('id', rawStepId)
      .maybeSingle();

    if (stepByIdError && stepByIdError.code !== 'PGRST116') {
      return handleApiError(stepByIdError, 'Failed to resolve workflow step');
    }

    let stepRecord = stepById;

    if (!stepRecord && /^[0-9]+$/.test(rawStepId)) {
      const { data: legacyStep, error: legacyStepError } = await supabase
        .from('workflow_steps')
        .select('id, name, role, step_id')
        .eq('workflow_id', workflowId)
        .eq('step_id', rawStepId)
        .maybeSingle();

      if (legacyStepError && legacyStepError.code !== 'PGRST116') {
        return handleApiError(legacyStepError, 'Failed to resolve workflow step');
      }

      stepRecord = legacyStep;
    }

    if (!stepRecord) {
      return NextResponse.json(
        { success: false, error: 'Step not found in workflow' },
        { status: 404 }
      );
    }
    
    // Check if user profile exists for the email
    let userExists = false;
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();

    if (profileError) {
        // Log this error to a proper system, but don't necessarily fail the whole invite creation
        // It might be a transient DB issue for the profile check only.
    }
    if (existingProfile) {
        userExists = true;
    }

    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: invitation, error: invitationDbError } = await supabase
      .from('workflow_invitations')
      .insert({
        workflow_id: String(workflowId),
        step_id: body.stepId,
        email: body.email,
        role: (stepRecord.role && typeof stepRecord.role === 'string') ? stepRecord.role : 'editor',
        invite_token: inviteToken,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single();
    
    if (invitationDbError) {
      // This is a more critical error, as the invitation record failed.
      return handleApiError(invitationDbError, 'Failed to create invitation record');
    }
    
    // If user does not have a profile, send a Supabase auth invitation
    if (!userExists) {
      try {
        await verifyEmailTemplates();
        let userRole = 'viewer';
        if (stepRecord.role === 'admin') userRole = 'admin';
        else if (typeof stepRecord.role === 'string' && ['editor', 'brand', 'legal'].includes(stepRecord.role)) userRole = 'editor';

        await supabase.auth.admin.inviteUserByEmail(body.email, {
          data: {
            full_name: body.full_name || '',
            job_title: body.job_title || '',
            company: body.company || extractCompanyFromEmail(body.email) || '',
            role: userRole,
            invited_by: user.id,
            invited_from_workflow: workflowId
          }
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_emailError) {
        // Non-critical: Invitation record created, but email failed. Log to monitoring.
      }
    }
    
    const response = NextResponse.json({
      success: true,
      invitation
    });

    await logSecurityEvent('workflow_invitation_created', {
      workflowId,
      stepId: body.stepId,
      inviteEmail: body.email,
      createdBy: user.id,
      brandId: workflowBrandId,
    }, user.id);

    return response;
  } catch (error) {
    return handleApiError(error, 'Error creating invitation');
  }
});

/**
 * GET endpoint to get all invitations for a workflow
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (_request: NextRequest, user: User, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const workflowId = params?.id;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: 'Workflow ID is required in path' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const isGlobalAdmin = isPlatformAdminUser(user);
    if (!isGlobalAdmin) {
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflows')
        .select('brand_id')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflowData || !workflowData.brand_id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Unable to verify workflow brand access.' },
          { status: 403 }
        );
      }

      try {
        await requireBrandAccess(supabase, user, workflowData.brand_id);
      } catch (error) {
        if (error instanceof BrandPermissionVerificationError) {
          return NextResponse.json(
            { success: false, error: 'Unable to verify brand permissions at this time.' },
            { status: 500 }
          );
        }
        if (error instanceof Error && error.message === 'NO_BRAND_ACCESS') {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You do not have permission to view invitations for this workflow.' },
            { status: 403 }
          );
        }
        throw error;
      }
    }

    const { data: invitations, error } = await supabase
      .from('workflow_invitations')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      invitations
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching invitations');
  }
}); 
