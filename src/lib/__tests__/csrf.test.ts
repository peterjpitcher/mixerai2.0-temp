import { generateCSRFToken, validateCSRFToken, shouldProtectRoute } from '@/lib/csrf';

function createMockRequest(options: { method?: string; headerToken?: string | null; cookieToken?: string | null }) {
  const { method = 'POST', headerToken = null, cookieToken = null } = options;
  const headers = new Headers();
  if (headerToken !== null) {
    headers.set('x-csrf-token', headerToken);
  }

  return {
    method,
    headers,
    cookies: {
      get: (name: string) => {
        if (name === 'csrf-token' && cookieToken !== null) {
          return { name, value: cookieToken };
        }
        return undefined;
      },
    },
  } as unknown as import('next/server').NextRequest;
}

describe('CSRF utilities', () => {
  it('generates unique hex tokens', () => {
    const token = generateCSRFToken();
    const token2 = generateCSRFToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/i);
    expect(token).not.toBe(token2);
  });

  describe('validateCSRFToken', () => {
    it('allows safe HTTP methods without tokens', () => {
      const request = createMockRequest({ method: 'GET' });
      expect(validateCSRFToken(request)).toBe(true);
    });

    it('returns false when tokens missing', () => {
      const request = createMockRequest({ method: 'POST', headerToken: null, cookieToken: null });
      expect(validateCSRFToken(request)).toBe(false);
    });

    it('returns false when tokens mismatch', () => {
      const request = createMockRequest({ method: 'POST', headerToken: 'abc', cookieToken: 'def' });
      expect(validateCSRFToken(request)).toBe(false);
    });

    it('performs trimmed constant-time comparison', () => {
      const request = createMockRequest({ method: 'PATCH', headerToken: ' token ', cookieToken: 'token' });
      expect(validateCSRFToken(request)).toBe(true);
    });
  });

  describe('shouldProtectRoute', () => {
    it('exempts public API routes and webhooks', () => {
      expect(shouldProtectRoute('/api/auth/login')).toBe(false);
      expect(shouldProtectRoute('/api/webhooks/stripe')).toBe(false);
    });

    it('ignores static assets', () => {
      expect(shouldProtectRoute('/api/test.js')).toBe(false);
      expect(shouldProtectRoute('/api/styles/main.css')).toBe(false);
    });

    it('protects other API routes by default', () => {
      expect(shouldProtectRoute('/api/secure/action')).toBe(true);
    });
  });
});
