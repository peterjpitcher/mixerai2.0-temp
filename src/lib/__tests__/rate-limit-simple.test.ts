import { NextRequest } from 'next/server';
import { checkRateLimit, getRateLimitType } from '../rate-limit-simple';

jest.mock('../rate-limit', () => {
  const actual = jest.requireActual('../rate-limit');
  return {
    ...actual,
    checkRateLimit: jest.fn(async (_req, _config, opts) => ({
      allowed: true,
      remaining: 1,
      reset: new Date(),
      retryAfter: undefined,
      backend: 'memory',
      limit: _config.max,
      __identifier: opts?.identifier,
      __keyParts: opts?.keyParts,
    })),
  };
});

const mockedAdvanced = require('../rate-limit').checkRateLimit as jest.Mock;

const buildRequest = (pathname: string) =>
  new NextRequest(`https://example.com${pathname}`, {
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  });

describe('rate-limit-simple', () => {
  beforeEach(() => {
    mockedAdvanced.mockClear();
  });

  it('derives rate limit type from pathname', () => {
    expect(getRateLimitType('/api/auth/login')).toBe('auth');
    expect(getRateLimitType('/API/TOOLS/content-transcreator')).toBe('ai-expensive');
    expect(getRateLimitType('/api/tools/quick-copy')).toBe('ai-standard');
    expect(getRateLimitType('/api/users/update')).toBe('sensitive');
    expect(getRateLimitType('/api/anything-else')).toBe('api');
  });

  it('passes user identifier through to advanced checker', async () => {
    const request = buildRequest('/api/users/me');
    await checkRateLimit(request, 'sensitive', 'user-123');

    expect(mockedAdvanced).toHaveBeenCalledTimes(1);
    const call = mockedAdvanced.mock.calls[0];
    expect(call[2]).toMatchObject({ identifier: 'user-123' });
  });

  it('falls back to anonymous key parts when user id missing', async () => {
    const request = buildRequest('/api/content/generate');
    await checkRateLimit(request, 'ai-standard');

    const call = mockedAdvanced.mock.calls[0];
    expect(call[2]).toMatchObject({ keyParts: ['middleware', 'ai-standard', 'anonymous'] });
  });
  it('recovers gracefully when advanced checker throws', async () => {
    mockedAdvanced.mockRejectedValueOnce(new Error('redis down'));
    const request = buildRequest('/api/secure');
    const result = await checkRateLimit(request, 'api', 'user-1');

    expect(result.allowed).toBe(true);
    expect(result.message).toBe('Rate limiting unavailable');
  });
});
