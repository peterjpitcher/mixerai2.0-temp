import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { normalizeOutputsMap } from '@/lib/content/html-normalizer';
import { generateVettingAgencyFeedback } from '@/lib/azure/openai';
import type { VettingFeedbackStageResult, VettingFeedbackItem, VettingFeedbackPriority } from '@/types/vetting-feedback';
import type { Json } from '@/types/supabase';

export const dynamic = 'force-dynamic';

interface VettingAgencyRecord {
  agency_id: string;
  content_vetting_agencies: {
    id: string;
    name: string;
    description: string | null;
    country_code: string | null;
    priority: string | null;
  } | null;
}

const priorityStringToLabel = (priority: string | null | undefined): 'High' | 'Medium' | 'Low' | 'Unknown' => {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Unknown';
  }
};

export const POST = withAuthAndCSRF(async (request: NextRequest, user, context) => {
  const { params } = context as { params: { id: string } };
  const contentId = params.id;

  try {
    const body = await request.json();
    const stageId = String(body.stageId ?? '').trim();
    const providedStageName = typeof body.stageName === 'string' ? body.stageName : null;
    const force = Boolean(body.force);

    if (!stageId) {
      return NextResponse.json(
        { success: false, error: 'Stage identifier is required to generate vetting feedback.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(
        `
          id,
          title,
          brand_id,
          content_data,
          template_id,
          workflow_id,
          created_by,
          assigned_to
        `
      )
      .eq('id', contentId)
      .single();

    if (contentError) {
      if (contentError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
      }
      throw contentError;
    }

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
    }

    const globalRole = user.user_metadata?.role;
    if (globalRole !== 'admin') {
      let isAuthorised = false;

      if (content.brand_id) {
        const { data: brandPermission, error: brandPermError } = await supabase
          .from('user_brand_permissions')
          .select('brand_id')
          .eq('user_id', user.id)
          .eq('brand_id', content.brand_id)
          .maybeSingle();

        if (brandPermError) {
          console.error('[Vetting Feedback] Error checking brand permissions:', brandPermError);
          return handleApiError(brandPermError, 'Failed to verify brand permissions');
        }

        if (brandPermission) {
          isAuthorised = true;
        }
      }

      if (!isAuthorised) {
        const assignedUsers = Array.isArray(content.assigned_to) ? content.assigned_to : [];
        if (assignedUsers.includes(user.id) || content.created_by === user.id) {
          isAuthorised = true;
        }
      }

      if (!isAuthorised) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to perform this action for this content item.' },
          { status: 403 }
        );
      }
    }

    const existingFeedbackMap = ((content.content_data as Record<string, unknown> | null)?.vettingFeedback ?? {}) as Record<string, VettingFeedbackStageResult>;
    const existingStageFeedback = existingFeedbackMap[stageId];

    if (existingStageFeedback && !force) {
      return NextResponse.json({ success: true, data: existingStageFeedback, skipped: true });
    }

    if (!content.template_id) {
      return NextResponse.json(
        { success: false, error: 'Content template is required to generate vetting feedback.' },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from('content_templates')
      .select('id, name, fields')
      .eq('id', content.template_id)
      .single();

    if (templateError) {
      throw templateError;
    }

    const templateFields = (template?.fields as { outputFields?: unknown } | null) ?? null;
    const outputFields = Array.isArray(templateFields?.outputFields)
      ? (templateFields.outputFields as Array<{ id: string; name: string; type?: string }> )
      : [];

    if (!content.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Content does not have an associated brand. Assign a brand before running vetting feedback.' },
        { status: 400 }
      );
    }

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select(
        `
          id,
          name,
          brand_identity,
          tone_of_voice,
          guardrails,
          brand_selected_agencies (
            agency_id,
            content_vetting_agencies (
              id,
              name,
              description,
              country_code,
              priority
            )
          )
        `
      )
      .eq('id', content.brand_id)
      .maybeSingle();

    if (brandError) {
      throw brandError;
    }

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Associated brand could not be found for this content.' },
        { status: 404 }
      );
    }

    const agencies = (brand.brand_selected_agencies || [])
      .map((item: VettingAgencyRecord) => {
        const agency = item.content_vetting_agencies;
        if (!agency) return null;
        return {
          id: agency.id,
          name: agency.name,
          description: agency.description,
          country_code: agency.country_code,
          priorityLabel: priorityStringToLabel(agency.priority),
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; description: string | null; country_code: string | null; priorityLabel: 'High' | 'Medium' | 'Low' | 'Unknown' }>;

    if (agencies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This brand does not have any vetting agencies configured.' },
        { status: 400 }
      );
    }

    const rawOutputs = (content.content_data as Record<string, unknown> | null)?.generatedOutputs as Record<string, unknown> | undefined;
    const normalizedOutputs = normalizeOutputsMap(rawOutputs, outputFields.map(field => ({ id: field.id, type: (field as { type?: string }).type ?? 'richText' })));

    const outputsForModel = outputFields
      .map(field => {
        const value = normalizedOutputs[field.id];
        if (!value || !value.plain) return null;
        return {
          fieldId: field.id,
          fieldName: field.name,
          plainText: value.plain,
        };
      })
      .filter(Boolean) as Array<{ fieldId: string; fieldName: string; plainText: string }>;

    const agenciesPayload = agencies.map(agency => ({
      agencyId: agency.id,
      agencyName: agency.name,
      description: agency.description ?? '',
      countryCode: agency.country_code ?? '',
      priority: agency.priorityLabel,
    }));

    const resolvedStageName = providedStageName || (async () => {
      if (!content.workflow_id) return null;
      const { data: step, error: stepError } = await supabase
        .from('workflow_steps')
        .select('name')
        .eq('id', stageId)
        .maybeSingle();
      if (stepError) {
        console.error('[Vetting Feedback] Error fetching workflow step name:', stepError);
        return null;
      }
      return step?.name ?? null;
    })();

    const stageNameValue = typeof resolvedStageName === 'object' && 'then' in resolvedStageName ? await resolvedStageName : resolvedStageName;

    const feedbackItems = await generateVettingAgencyFeedback({
      brandName: brand.name,
      workflowStage: stageNameValue ?? stageId,
      agencies: agenciesPayload,
      outputs: outputsForModel,
      guardrails: brand.guardrails ?? '',
      toneOfVoice: brand.tone_of_voice ?? '',
      brandIdentity: brand.brand_identity ?? '',
    });

    const nowIso = new Date().toISOString();
    const updatedStageFeedback: VettingFeedbackStageResult = {
      stageId,
      stageName: stageNameValue ?? stageId,
      generatedAt: nowIso,
      generatedBy: user.id,
      items: feedbackItems,
      metadata: {
        brandName: brand.name,
        workflowStage: stageNameValue ?? stageId,
        agenciesEvaluated: agencies.map(agency => ({ agencyId: agency.id, agencyName: agency.name })),
      },
    };

    const feedbackMapToStore: Record<string, VettingFeedbackStageResult> = {
      ...existingFeedbackMap,
      [stageId]: updatedStageFeedback,
    };

    const updatedContentData = {
      ...(content.content_data as Record<string, unknown> | null ?? {}),
      vettingFeedback: feedbackMapToStore,
    } as Record<string, unknown>;

    const { error: updateError } = await supabase
      .from('content')
      .update({
        content_data: updatedContentData as Json,
        updated_at: nowIso,
      })
      .eq('id', contentId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updatedStageFeedback });
  } catch (error) {
    return handleApiError(error, 'Error generating vetting feedback');
  }
});
