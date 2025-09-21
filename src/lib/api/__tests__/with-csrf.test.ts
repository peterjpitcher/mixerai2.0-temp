import { NextResponse } from 'next/server';

jest.mock('@/lib/csrf', () => ({
  validateCSRFToken: jest.fn(),
  CSRF_ERROR_RESPONSE: {
    success: false,
    error: 'CSRF validation failed',
    code: 'CSRF_VALIDATION_FAILED',
    message: 'Request rejected due to invalid or missing CSRF token',
  },
}));

const mockUser = { id: 'auth-user' };

jest.mock('@/lib/auth/api-auth', () => ({
  withAuth: jest.fn((handler: any) => async (req: Request, context?: unknown) => handler(req, mockUser, context)),
}));

import { withCSRF, withAuthAndCSRF } from '@/lib/api/with-csrf';
import { validateCSRFToken } from '@/lib/csrf';
import { withAuth } from '@/lib/auth/api-auth';

describe('withCSRF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 with structured payload when CSRF validation fails', async () => {
    (validateCSRFToken as jest.Mock).mockReturnValue(false);

    const handler = withCSRF(async () => NextResponse.json({ ok: true }));
    const response = await handler({} as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        code: 'CSRF_VALIDATION_FAILED',
        success: false,
        error: 'CSRF validation failed',
        timestamp: expect.any(String),
      })
    );
  });

  it('delegates to handler when CSRF validation succeeds', async () => {
    (validateCSRFToken as jest.Mock).mockReturnValue(true);
    const handlerSpy = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const handler = withCSRF(handlerSpy);

    const req = { url: 'http://localhost', method: 'POST' } as any;
    const extraArg = { foo: 'bar' };
    const response = await handler(req, extraArg);

    expect(handlerSpy).toHaveBeenCalledWith(req, extraArg);
    expect(response.status).toBe(200);
  });
});

describe('withAuthAndCSRF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateCSRFToken as jest.Mock).mockReturnValue(true);
  });

  it('applies both auth and CSRF wrappers', async () => {
    const context = { params: { id: '123' } };

    const innerHandler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuthAndCSRF(innerHandler);

    const req = { method: 'POST' } as any;
    const response = await wrapped(req, context);

    expect(withAuth).toHaveBeenCalledTimes(1);
    expect(innerHandler).toHaveBeenCalledWith(req, mockUser, context);
    expect(response.status).toBe(200);
  });
});
