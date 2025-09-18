import { headers } from 'next/headers';

interface ContentAuditEvent {
  action: string;
  userId: string;
  brandId?: string | null;
  templateId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logContentGenerationAudit(event: ContentAuditEvent): Promise<void> {
  try {
    const h = headers();
    const auditPayload = {
      ...event,
      ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: h.get('user-agent') ?? null,
      timestamp: new Date().toISOString(),
    };

    // Placeholder for durable audit storage (Supabase/observability pipeline)
    console.log('[CONTENT_GENERATION_AUDIT]', auditPayload);
  } catch (error) {
    console.warn('[CONTENT_GENERATION_AUDIT] Failed to log audit event', error);
  }
}
