import { ok, fail } from '@/lib/http/response';

describe('http/response helpers', () => {
  it('ok returns success true and data', async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    const payload = await (res as Response).json();
    expect(payload).toEqual({ success: true, data: { a: 1 }, timestamp: expect.any(String) });
  });
  it('fail returns success false and error', async () => {
    const res = fail(400, 'Bad');
    expect(res.status).toBe(400);
    const payload = await (res as Response).json();
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Bad');
  });
});
