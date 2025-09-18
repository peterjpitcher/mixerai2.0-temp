import { headers } from 'next/headers';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { emitMetric } from '@/lib/observability/metrics';

export interface AiUsageEvent {
  action: string;
  userId: string;
  brandId?: string | null;
  inputCharCount: number;
  metadata?: Record<string, unknown>;
  status?: 'success' | 'error';
  errorMessage?: string;
}

export async function logAiUsage(event: AiUsageEvent): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const h = headers();

  const ipAddress = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = h.get('user-agent') ?? null;

  const enrichedMetadata: Record<string, unknown> = {
    inputCharCount: event.inputCharCount,
    status: event.status ?? 'success',
    ...event.metadata,
  };

  if (event.errorMessage) {
    enrichedMetadata.error = event.errorMessage;
  }

  const { error } = await supabase.rpc('log_user_activity' as never, {
    p_user_id: event.userId,
    p_action_type: event.action,
    p_action_category: 'api_usage',
    p_resource_type: 'ai_helper',
    p_resource_id: null,
    p_resource_name: event.action,
    p_brand_id: event.brandId ?? null,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_metadata: enrichedMetadata,
  } as never);

  if (error) {
    emitMetric({
      name: 'audit.persist.failure',
      tags: { category: 'ai_helper' },
      context: {
        userId: event.userId,
        brandId: event.brandId ?? undefined,
        error: error.message,
      },
    });
    throw new Error(`Failed to persist AI usage audit entry: ${error.message}`);
  }

  emitMetric({
    name: 'audit.persist.success',
    tags: { category: 'ai_helper', status: enrichedMetadata.status as string },
    context: {
      userId: event.userId,
      brandId: event.brandId ?? undefined,
      inputCharCount: event.inputCharCount,
    },
  });
}
