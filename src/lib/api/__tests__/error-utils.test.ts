import { z } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

import {
  isPostgrestError,
  getPostgrestErrorStatus,
  getPostgrestErrorMessage,
  formatZodError,
  isRateLimitError,
  isAuthError,
  apiErrorResponses,
  handleEnhancedApiError,
} from '@/lib/api/error-utils';

describe('api/error-utils', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Postgrest helpers', () => {
    it('detects PostgREST shaped errors', () => {
      const error = { code: '23505', message: 'duplicate key', details: 'key exists', hint: null } as unknown;
      expect(isPostgrestError(error)).toBe(true);
      expect(isPostgrestError({ code: 123, message: 'oops' })).toBe(false);
    });

    it('maps PostgREST codes to HTTP status and friendly messages', () => {
      expect(getPostgrestErrorStatus('23505')).toBe(409);
      expect(getPostgrestErrorStatus('pgrst301')).toBe(401);
      expect(getPostgrestErrorStatus('unknown')).toBe(500);

      const error = {
        code: '23503',
        message: '',
        details: 'Cannot delete, in use',
        hint: 'Remove dependency',
      } as PostgrestError;
      expect(getPostgrestErrorMessage(error)).toBe('Cannot complete operation due to related records');

      const fallbackError = {
        code: '99999',
        message: '',
        details: 'Row missing',
        hint: 'Check permissions',
      } as PostgrestError;
      expect(getPostgrestErrorMessage(fallbackError)).toBe('Row missing');
    });
  });

  describe('validation helpers', () => {
    it('formats Zod errors with root fallback', () => {
      const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() });
      const result = schema.safeParse({ name: '', age: -1 });
      if (result.success) {
        throw new Error('Expected validation failure');
      }

      const formatted = formatZodError(result.error);
      expect(formatted.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'age' }),
        ])
      );
      expect(formatted.message).toContain('Validation failed');
    });
  });

  describe('classification helpers', () => {
    it('detects rate limit scenarios by status code and message', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isRateLimitError('Too many requests')).toBe(true);
      expect(isRateLimitError(new Error('Authentication required'))).toBe(false);
    });

    it('detects authentication failures across variants', () => {
      expect(isAuthError({ status: 401 })).toBe(true);
      expect(isAuthError(new Error('JWT expired'))).toBe(true);
      const postgrestAuth = { code: 'PGRST302', details: '', message: 'invalid jwt', hint: null } as PostgrestError;
      expect(isAuthError(postgrestAuth)).toBe(true);
      expect(isAuthError('permission denied')).toBe(false);
    });
  });

  describe('apiErrorResponses', () => {
    it('produces structured unauthorized responses', async () => {
      const response = apiErrorResponses.unauthorized();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual(
        expect.objectContaining({ success: false, code: 'UNAUTHORIZED', error: 'Unauthorized access' })
      );
    });

    it('sets Retry-After header for rate limit responses', async () => {
      const response = apiErrorResponses.rateLimitExceeded(12.3);
      expect(response.headers.get('Retry-After')).toBe('13');
      const body = await response.json();
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('normalises method lists for methodNotAllowed responses', async () => {
      const response = apiErrorResponses.methodNotAllowed(['get', 'POST', '']);
      expect(response.headers.get('Allow')).toBe('GET, POST');
      const body = await response.json();
      expect(body.error).toContain('GET, POST');
    });
  });

  describe('handleEnhancedApiError', () => {
    it('returns validation response for Zod errors', async () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: 'invalid' });
      if (result.success) {
        throw new Error('Expected schema to fail');
      }

      const response = handleEnhancedApiError(result.error);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('maps PostgREST conflict errors correctly', async () => {
      const conflictError = {
        code: '23505',
        message: '',
        details: 'duplicate',
        hint: null,
      } as PostgrestError;

      const response = handleEnhancedApiError(conflictError);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.code).toBe('CONFLICT');
    });

    it('handles generic Errors with keyword detection', async () => {
      const notFoundResponse = handleEnhancedApiError(new Error('Record not found in table'));
      expect(notFoundResponse.status).toBe(404);

      const forbiddenResponse = handleEnhancedApiError(new Error('Permission denied'));
      expect(forbiddenResponse.status).toBe(403);
    });

    it('falls back to server error and logs unknown payloads', async () => {
      const response = handleEnhancedApiError({ unexpected: true });
      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
