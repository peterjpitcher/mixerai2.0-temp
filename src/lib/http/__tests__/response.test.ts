import { ok, fail } from '@/lib/http/response';

describe('http/response helpers', () => {
  it('ok returns success true and data', () => {
    const res: any = ok({ a: 1 });
    expect(res._body).toBeDefined();
  });
  it('fail returns success false and error', () => {
    const res: any = fail(400, 'Bad');
    expect(res.status).toBe(400);
  });
});

