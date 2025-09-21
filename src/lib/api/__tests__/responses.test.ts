import { apiSuccess, apiError, calculatePagination, getPaginationParams } from '@/lib/api/responses';

describe('apiSuccess', () => {
  it('returns success payload with timestamp and optional message', async () => {
    const response = apiSuccess({ id: 1 }, { message: 'Created', status: 201 });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: { id: 1 },
      message: 'Created',
      timestamp: expect.any(String),
    });
  });

  it('includes pagination metadata when provided', async () => {
    const pagination = { page: 2, limit: 10, total: 50, totalPages: 5, hasNextPage: true, hasPreviousPage: true };
    const response = apiSuccess(['a', 'b'], { pagination });
    const body = await response.json();
    expect(body.pagination).toEqual(pagination);
  });
});

describe('apiError', () => {
  it('returns error payload with code and timestamp', async () => {
    const response = apiError('Not found', { status: 404, code: 'NOT_FOUND', details: { resource: 'brand' } });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
      details: { resource: 'brand' },
      timestamp: expect.any(String),
    });
  });
});

describe('pagination helpers', () => {
  it('calculates pagination metadata correctly', () => {
    const meta = calculatePagination(45, 2, 10);
    expect(meta).toEqual({
      page: 2,
      limit: 10,
      total: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('returns zero pages when total count is zero', () => {
    const meta = calculatePagination(0, 1, 10);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
  });

  it('extracts pagination params with safeguards', () => {
    const params = new URLSearchParams({ page: '3', limit: '500' });
    const result = getPaginationParams(params, 25);
    expect(result).toEqual({ page: 3, limit: 100, offset: 200 });
  });

  it('falls back to defaults for invalid numbers', () => {
    const params = new URLSearchParams({ page: '-5', limit: 'NaN' });
    const result = getPaginationParams(params, 30);
    expect(result).toEqual({ page: 1, limit: 30, offset: 0 });
  });
});
