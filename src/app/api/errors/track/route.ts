import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

const errorSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(8000).optional(),
  info: z.record(z.any()).optional(),
  fingerprint: z.string().max(512).optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
});

const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, ip: string): boolean {
  const key = `${userId || 'anonymous'}:${ip || 'unknown'}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count >= RATE_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export const POST = withAuthAndCSRF(async (request: NextRequest, user): Promise<Response> => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || 'unknown';

    if (!checkRateLimit(user?.id ?? 'anonymous', ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many error reports. Please retry shortly.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json();
    const parsed = errorSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const errorLog = {
      ...parsed.data,
      sessionUserId: user?.id,
      sessionEmail: user?.email,
      reporterIp: ip,
      reportedAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') ?? null,
    };

    try {
      const supabase = createSupabaseAdminClient();
      await (supabase as any).from('error_reports').insert({
        user_id: user?.id ?? null,
        severity: parsed.data.severity ?? 'error',
        fingerprint: parsed.data.fingerprint ?? null,
        payload: errorLog,
        reporter_ip: ip,
        user_agent: request.headers.get('user-agent') ?? null,
      });
    } catch (dbError) {
      console.error('[ErrorReports] Failed to persist error log:', dbError);
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('[Production Error]', errorLog);
    } else {
      console.error('[Development Error]', errorLog);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Error tracked successfully' 
    });
  } catch (error) {
    console.error('Failed to track error:', error);
    // Don't throw - we don't want error tracking to cause more errors
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to track error' 
    }, { status: 500 });
  }
});
