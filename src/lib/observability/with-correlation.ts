import { NextResponse } from 'next/server';
import { getOrCreateCorrelationId } from './correlation';
import { logError } from '@/lib/logger';

export function withCorrelation<T extends (...args: any[]) => Promise<Response | NextResponse>>(handler: T): T {
  // @ts-ignore
  return (async (...args: any[]) => {
    const cid = getOrCreateCorrelationId();
    try {
      const res = await handler(...args);
      try { res.headers.set('x-correlation-id', cid); } catch {}
      return res;
    } catch (e) {
      logError('[withCorrelation] api-error', { cid, e: String(e) });
      throw e;
    }
  }) as T;
}
