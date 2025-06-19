import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

// Mock NextRequest
const createMockRequest = (ip: string = '127.0.0.1', pathname: string = '/api/test'): NextRequest => {
  const url = `http://localhost:3000${pathname}`;
  const request = new NextRequest(url);
  // Override the ip property
  Object.defineProperty(request, 'ip', {
    value: ip,
    writable: false,
    configurable: true
  });
  return request;
};

describe('Rate Limiting', () => {
  const testConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many requests'
  };

  beforeEach(() => {
    // Clear the rate limit store between tests
    // Since the store is in-memory, we need to access it directly
    // @ts-expect-error - accessing private variable for testing
    global.rateLimitStore = new Map();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within the rate limit', () => {
      const request = createMockRequest();
      
      for (let i = 0; i < testConfig.max; i++) {
        const result = checkRateLimit(request, testConfig);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(testConfig.max - i - 1);
        expect(result.limit).toBe(testConfig.max);
      }
    });

    it('should block requests exceeding the rate limit', () => {
      const request = createMockRequest();
      
      // Use up all allowed requests
      for (let i = 0; i < testConfig.max; i++) {
        checkRateLimit(request, testConfig);
      }
      
      // Next request should be blocked
      const result = checkRateLimit(request, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different IPs separately', () => {
      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      
      // Use up rate limit for first IP
      for (let i = 0; i < testConfig.max; i++) {
        checkRateLimit(request1, testConfig);
      }
      
      // Second IP should still be allowed
      const result = checkRateLimit(request2, testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(testConfig.max - 1);
    });

    it('should reset after the time window expires', (done) => {
      const shortWindowConfig: RateLimitConfig = {
        windowMs: 100, // 100ms for testing
        max: 2,
        message: 'Too many requests'
      };
      
      const request = createMockRequest();
      
      // Use up rate limit
      checkRateLimit(request, shortWindowConfig);
      checkRateLimit(request, shortWindowConfig);
      
      // Should be blocked
      let result = checkRateLimit(request, shortWindowConfig);
      expect(result.allowed).toBe(false);
      
      // Wait for window to expire
      setTimeout(() => {
        result = checkRateLimit(request, shortWindowConfig);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(shortWindowConfig.max - 1);
        done();
      }, 150);
    });

    it('should handle missing IP gracefully', () => {
      const request = createMockRequest('');
      const result = checkRateLimit(request, testConfig);
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(testConfig.max);
    });

    it('should use user ID for authenticated requests when available', () => {
      const request = createMockRequest();
      const userId = 'user-123';
      
      // Simulate authenticated request
      const result1 = checkRateLimit(request, testConfig, userId);
      expect(result1.allowed).toBe(true);
      
      // Different IP, same user should share rate limit
      const request2 = createMockRequest('10.0.0.1');
      const result2 = checkRateLimit(request2, testConfig, userId);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(testConfig.max - 2); // Shared counter
    });

    it('should implement exponential backoff for repeat offenders', () => {
      const request = createMockRequest();
      
      // Use up initial rate limit
      for (let i = 0; i < testConfig.max; i++) {
        checkRateLimit(request, testConfig);
      }
      
      // First violation
      let result = checkRateLimit(request, testConfig);
      expect(result.allowed).toBe(false);
      const firstRetryAfter = result.retryAfter || 0;
      
      // Subsequent violations should have longer retry times
      result = checkRateLimit(request, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(firstRetryAfter);
    });
  });
});