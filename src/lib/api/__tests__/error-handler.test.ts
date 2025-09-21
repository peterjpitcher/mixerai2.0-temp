import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api-client';
import {
  createErrorResponse,
  createSuccessResponse,
  getErrorStatus,
  handleStandardApiError,
} from '@/lib/api/error-handler';

describe('api/error-handler', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates structured error responses with code and timestamp', async () => {
    process.env.NODE_ENV = 'test';
    const error = new Error('Invalid email');
    const response = createErrorResponse(error, 'INVALID_INPUT', 422, { includeDetails: true });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
        code: 'INVALID_INPUT',
        timestamp: expect.any(String),
        details: 'Invalid email',
      })
    );
  });

  it('derives status from ApiClientError', () => {
    const responseMock = new Response(null, { status: 409, statusText: 'Conflict' });
    const apiError = new ApiClientError('Conflict', {
      status: 409,
      statusText: 'Conflict',
      response: responseMock,
      body: null,
    });

    expect(getErrorStatus(apiError)).toBe(409);
    const response = createErrorResponse(apiError, 'SAVE_FAILED');
    expect(response.status).toBe(409);
  });

  it('pulls status from Response-like objects', () => {
    const mockResponse = new Response(null, { status: 404 });
    expect(getErrorStatus(mockResponse)).toBe(404);
    expect(getErrorStatus({ statusCode: 418 })).toBe(418);
  });

  it('returns success payload with timestamp', async () => {
    const response = createSuccessResponse({ id: 1 }, 'Created', 201);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { id: 1 }, message: 'Created', timestamp: expect.any(String) });
  });

  it('handleStandardApiError delegates to createErrorResponse with derived status', async () => {
    const response = handleStandardApiError(new Error('Unauthorized request'), 'UNAUTHORIZED');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
