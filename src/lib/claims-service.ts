import { getStackedClaimsForProduct, getStackedClaimsForProductRPC, type EffectiveClaim } from '@/lib/claims-utils';
import { memoryCache as cache } from '@/lib/cache/memory-cache';
import { logDebug } from '@/lib/logger';

const DEFAULT_TTL = 300; // seconds

function ttl() {
  const t = Number(process.env.CLAIMS_CACHE_TTL || DEFAULT_TTL);
  return Number.isFinite(t) && t > 0 ? t : DEFAULT_TTL;
}

export async function getEffectiveClaimsCached(productId: string, countryCode: string): Promise<EffectiveClaim[]> {
  const key = `stacked:${productId}:${countryCode}`;
  const hit = await cache.get<EffectiveClaim[]>(key);
  if (hit) {
    logDebug('[claims-cache] hit', { key });
    return hit;
  }
  logDebug('[claims-cache] miss', { key });
  const useRpc = process.env.CLAIMS_USE_RPC === '1';
  const data = useRpc
    ? await getStackedClaimsForProductRPC(productId, countryCode)
    : await getStackedClaimsForProduct(productId, countryCode);
  await cache.set(key, data, ttl());
  return data;
}

export async function invalidateClaimsCacheForProduct(productId: string) {
  const prefix = `stacked:${productId}:`;
  logDebug('[claims-cache] invalidate prefix', { prefix });
  await cache.mdel(prefix);
}

export async function invalidateAllClaimsCache() {
  await cache.mdel('stacked:');
}
