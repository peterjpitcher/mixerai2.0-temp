import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

export async function logClaimAudit(action: string, userId: string, resourceId: string, details?: any) {
  try {
    const h = headers();
    const supabase = createSupabaseAdminClient();
    await (supabase as any).from('claim_audit_logs').insert({
      user_id: userId,
      action,
      resource_id: resourceId,
      details: details ? { ...details, truncated: true } : null,
      ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
      user_agent: h.get('user-agent') ?? null
    });
  } catch (e) {
    console.warn('[audit] Failed to log claim audit', e);
  }
}
