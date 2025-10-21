import { NextResponse } from 'next/server';
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import {
  logVettingAgencyEvent,
  mapAgencyRow,
  type VettingAgencyPriorityLabel,
  type VettingAgencyStatus,
} from '@/lib/vetting-agencies/service';

type RouteContext = {
  params: {
    id?: string;
  };
};

function normalizePriority(value: unknown): VettingAgencyPriorityLabel | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'low') return 'Low';
  return undefined;
}

function normalizeStatus(value: unknown): VettingAgencyStatus | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'pending_verification') return 'pending_verification';
  if (normalized === 'rejected') return 'rejected';
  return undefined;
}

export const PATCH = withAdminAuthAndCSRF(async (request, user, rawContext?: unknown) => {
  try {
    const context = rawContext as RouteContext | undefined;
    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Agency ID is required' }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({} as Record<string, unknown>));

    const updates: Record<string, unknown> = {};

    const status = normalizeStatus(payload.status);
    if (payload.status !== undefined && !status) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
    }

    const priority = normalizePriority(payload.priority);
    if (payload.priority !== undefined && !priority) {
      return NextResponse.json({ success: false, error: 'Invalid priority value' }, { status: 400 });
    }

    if (status) updates.status = status;
    if (priority) updates.priority = priority;

    if (Array.isArray(payload.categoryTags)) {
      updates.category_tags = payload.categoryTags.map((tag: unknown) => String(tag).trim()).filter(Boolean);
    }

    if (Array.isArray(payload.languageCodes)) {
      updates.language_codes = payload.languageCodes.map((code: unknown) => String(code).trim()).filter(Boolean);
    }

    if (typeof payload.regulatoryScope === 'string') {
      updates.regulatory_scope = payload.regulatoryScope.trim() || null;
    }

    if (typeof payload.websiteUrl === 'string') {
      updates.website_url = payload.websiteUrl.trim() || null;
    }

    if (typeof payload.rationale === 'string') {
      updates.rationale = payload.rationale.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields provided for update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createSupabaseAdminClient();

    const { data: existingRow, error: fetchError } = await supabase
      .from('content_vetting_agencies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Failed to load agency before update:', fetchError);
      return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('content_vetting_agencies')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update vetting agency:', updateError);
      throw updateError;
    }

    const updatedRecord = mapAgencyRow(updatedRow);
    const previousRecord = mapAgencyRow(existingRow);

    if (status && status !== previousRecord.status) {
      const eventType = status === 'approved' ? 'accepted' : status === 'rejected' ? 'dismissed' : undefined;
      if (eventType) {
        await logVettingAgencyEvent(
          {
            brandId: null,
            agencyId: updatedRecord.id,
            eventType,
            countryCode: updatedRecord.countryCode,
            categoryTags: updatedRecord.categoryTags,
            createdBy: user.id,
            metadata: {
              previous_status: previousRecord.status,
              new_status: status,
            },
          },
          supabase,
        );
      }
    }

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error) {
    return handleApiError(error, 'Failed to update vetting agency');
  }
});
