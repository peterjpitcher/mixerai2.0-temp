import { checkRateLimit, RateLimitConfig, resetRateLimitStore } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

const createMockRequest = (ip: string = '127.0.0.1', pathname: string = '/api/test'): NextRequest => {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (ip) {
    headers.set('x-forwarded-for', ip);
  }
  return new NextRequest(url, { headers });
};

describe('Rate Limiting', () => {
  const testConfig: RateLimitConfig = {
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many requests',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    await resetRateLimitStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows requests within the configured limit', async () => {
      const request = createMockRequest();

      for (let i = 0; i < testConfig.max; i++) {
        const result = await checkRateLimit(request, testConfig);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(testConfig.max - i - 1);
        expect(result.limit).toBe(testConfig.max);
      }
    });

    it('blocks requests once the limit is exceeded', async () => {
      const request = createMockRequest();

      for (let i = 0; i < testConfig.max; i++) {
        await checkRateLimit(request, testConfig);
      }

      const result = await checkRateLimit(request, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('tracks different IP addresses independently', async () => {
      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');

      for (let i = 0; i < testConfig.max; i++) {
        await checkRateLimit(request1, testConfig);
      }

      const result = await checkRateLimit(request2, testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(testConfig.max - 1);
    });

    it('resets after the window expires', async () => {
      const shortWindowConfig: RateLimitConfig = {
        windowMs: 100,
        max: 2,
        message: 'Too many requests',
      };

      const request = createMockRequest();

      await checkRateLimit(request, shortWindowConfig);
      await checkRateLimit(request, shortWindowConfig);

      const result = await checkRateLimit(request, shortWindowConfig);
      expect(result.allowed).toBe(false);

      const tick = new Promise<void>((resolve) => {
        setTimeout(async () => {
          const nextResult = await checkRateLimit(request, shortWindowConfig);
          expect(nextResult.allowed).toBe(true);
          expect(nextResult.remaining).toBe(shortWindowConfig.max - 1);
          resolve();
        }, 150);
      });

      jest.advanceTimersByTime(150);
      await tick;
    });

    it('handles missing IP headers gracefully', async () => {
      const request = createMockRequest('');
      const result = await checkRateLimit(request, testConfig);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(testConfig.max);
    });

    it('supports custom identifiers for authenticated users', async () => {
      const request = createMockRequest();
      const userId = 'user-123';

      const firstResult = await checkRateLimit(request, testConfig, {
        identifier: userId,
        keyParts: ['test', 'user', userId],
      });
      expect(firstResult.allowed).toBe(true);

      const request2 = createMockRequest('10.0.0.1');
      const secondResult = await checkRateLimit(request2, testConfig, {
        identifier: userId,
        keyParts: ['test', 'user', userId],
      });
      expect(secondResult.allowed).toBe(true);
      expect(secondResult.remaining).toBe(testConfig.max - 2);
    });

    it('applies exponential backoff to repeat offenders', async () => {
      const request = createMockRequest();

      for (let i = 0; i < testConfig.max; i++) {
        await checkRateLimit(request, testConfig);
      }

      const firstResult = await checkRateLimit(request, testConfig);
      expect(firstResult.allowed).toBe(false);
      const firstRetryAfter = firstResult.retryAfter ?? 0;

      const secondResult = await checkRateLimit(request, testConfig);
      expect(secondResult.allowed).toBe(false);
      expect(secondResult.retryAfter ?? 0).toBeGreaterThanOrEqual(firstRetryAfter);
    });
  });
});
