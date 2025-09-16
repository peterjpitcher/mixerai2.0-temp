import { logDebug } from '@/lib/logger';

export async function timed<T>(name: string, fn: () => Promise<T>) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    const dur = Date.now() - t0;
    logDebug('[timing]', { name, ms: dur });
  }
}

