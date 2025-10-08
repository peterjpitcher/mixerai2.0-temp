import { headers } from 'next/headers';
import crypto from 'crypto';

export function getOrCreateCorrelationId() {
  try {
    const h = headers();
    const fromClient = h.get('x-request-id') || h.get('x-correlation-id');
    return fromClient || crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}
