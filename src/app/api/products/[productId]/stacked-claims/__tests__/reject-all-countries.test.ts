/**
 * Route test: stacked-claims rejects __ALL_COUNTRIES__
 */
import { NextResponse } from 'next/server';

jest.mock('@/lib/auth/api-auth', () => ({
  withAuth: (handler: any) => handler,
}));

// Avoid real DB calls; route returns early for __ALL_COUNTRIES__
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

describe('GET /api/products/[productId]/stacked-claims', () => {
  it('returns 400 when countryCode is __ALL_COUNTRIES__', async () => {
    const { GET } = await import('../route');
    const req = { url: 'http://localhost/api/products/p1/stacked-claims?countryCode=__ALL_COUNTRIES__' } as any;
    const ctx = { params: { productId: 'p1' } } as any;
    const res = (await GET(req, undefined as any, ctx)) as NextResponse;

    expect(res.status).toBe(400);
    const body = await (res as any).json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toMatch(/All Countries/i);
  });
});

