import { headers } from 'next/headers';

import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { emitMetric } from '@/lib/observability/metrics';

interface ContentAuditEvent {
  action: string;
  userId: string;
  brandId?: string | null;
  templateId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logContentGenerationAudit(event: ContentAuditEvent): Promise<void> {
  const h = headers();
  const supabase = createSupabaseAdminClient();

  const ipAddress = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = h.get('user-agent') ?? null;

  const { error } = await supabase.rpc('log_user_activity' as never, {
    p_user_id: event.userId,
    p_action_type: event.action,
    p_action_category: 'api_usage',
    p_resource_type: 'content_generation',
    p_resource_id: event.templateId ?? null,
    p_resource_name: event.metadata?.templateName ?? null,
    p_brand_id: event.brandId ?? null,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_metadata: event.metadata ?? {},
  } as never);

  if (error) {
    const message = error.message ?? 'unknown_error';
    console.warn('[audit][content_generation] Failed to persist audit entry:', message);
    emitMetric({
      name: 'audit.persist.failure',
      tags: { category: 'content_generation' },
      context: {
        userId: event.userId,
        brandId: event.brandId ?? undefined,
        error: message,
      },
    });
    // Do not block core flow if audit persistence fails (e.g., function missing, privilege issues)
    return;
  }

  emitMetric({
    name: 'audit.persist.success',
    tags: { category: 'content_generation' },
    context: {
      userId: event.userId,
      brandId: event.brandId ?? undefined,
      templateId: event.templateId ?? undefined,
    },
  });
}
