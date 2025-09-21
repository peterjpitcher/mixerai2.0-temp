import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { ok, fail } from '@/lib/http/response';
import { withCorrelation } from '@/lib/observability/with-correlation';
import { timed } from '@/lib/observability/timer';
import { getEffectiveClaimsCached } from '@/lib/claims-service';
import { ALL_COUNTRIES_CODE } from '@/lib/constants/claims';
import type { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type RouteContext = { params?: { productId?: string } };

export const GET = withCorrelation(withAuth(async (req: NextRequest, _user: User, context?: unknown) => {
  try {
    const { pathname, searchParams } = new URL(req.url);
    const params = (context as RouteContext | undefined)?.params;
    const productId = params?.productId ?? pathname.split('/').slice(-2)[0] ?? '';
    const countryCode = searchParams.get('countryCode') || '';
    if (!productId) return fail(400, 'Product ID is required');
    if (!countryCode) return fail(400, 'countryCode query parameter is required');
    if (countryCode === ALL_COUNTRIES_CODE) return fail(400, 'Use a specific market code. “All Countries” is not valid for this endpoint.');
    const data = await timed('stacked-claims', () => getEffectiveClaimsCached(productId, countryCode));
    return ok(data);
  } catch (e: any) {
    return fail(500, 'Failed to fetch stacked claims', e?.message);
  }
}));
