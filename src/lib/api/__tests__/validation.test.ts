import { z } from 'zod';

import { validateRequest, validatePaginationParams, commonSchemas } from '@/lib/api/validation';

describe('validateRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns parsed data when request is valid', async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Mixer' }),
      headers: { 'content-type': 'application/json' },
    });

    const result = await validateRequest(request, schema);
    expect(result).toEqual({ success: true, data: { name: 'Mixer' } });
  });

  it('returns structured error when JSON parsing fails', async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '{',
      headers: { 'content-type': 'application/json' },
    });

    const result = await validateRequest(request, schema, { includeErrorDetails: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(body.code).toBe('INVALID_JSON');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('details');
    }
  });

  it('returns validation error details when schema fails', async () => {
    const schema = z.object({ email: z.string().email() });
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid' }),
      headers: { 'content-type': 'application/json' },
    });

    const result = await validateRequest(request, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })])
      );
    }
  });

  it('supports custom parsers', async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request('http://localhost', {
      method: 'POST',
      body: 'name=Mixer',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    const result = await validateRequest(request, schema, {
      parser: async (req) => {
        const text = await req.text();
        const params = new URLSearchParams(text);
        return { name: params.get('name') };
      },
    });

    expect(result).toEqual({ success: true, data: { name: 'Mixer' } });
  });
});

describe('validatePaginationParams', () => {
  it('returns parsed pagination values and offset', () => {
    const url = new URL('http://localhost?page=2&limit=25');
    const result = validatePaginationParams(url);
    expect(result).toEqual({ page: 2, limit: 25, offset: 25 });
  });

  it('defaults to schema defaults when params missing', () => {
    const url = new URL('http://localhost');
    const result = validatePaginationParams(url);
    expect(result).toEqual({ page: 1, limit: 50, offset: 0 });
  });
});

describe('commonSchemas', () => {
  it('validates date range refinement', () => {
    const valid = commonSchemas.dateRange.parse({ start: new Date('2023-01-01').toISOString(), end: new Date('2023-01-02').toISOString() });
    expect(valid).toBeDefined();

    expect(() =>
      commonSchemas.dateRange.parse({
        start: new Date('2023-01-02').toISOString(),
        end: new Date('2023-01-01').toISOString(),
      })
    ).toThrow();
  });
});
