import { NextResponse } from 'next/server';
import { getOrCreateCorrelationId } from './correlation';
import { logError } from '@/lib/logger';

export function withCorrelation<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<Response> => {
    const cid = getOrCreateCorrelationId();
    try {
      const res = await handler(...args);
      try { res.headers.set('x-correlation-id', cid); } catch {}
      return res;
    } catch (e) {
      logError('[withCorrelation] api-error', { cid, e: String(e) });
      throw e;
    }
  };

  return wrapped as T;
}
