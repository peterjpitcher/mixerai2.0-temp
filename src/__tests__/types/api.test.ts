import { 
  isApiError, 
  isPostgresError,
  isSupabaseError,
  ApiError,
  PostgresError,
  SupabaseError
} from '@/types/api';

describe('API Type Guards', () => {
  describe('isApiError', () => {
    it('should identify Error objects with code property', () => {
      const error = new Error('Test error') as ApiError;
      error.code = 'ERR_001';
      
      expect(isApiError(error)).toBe(true);
    });

    it('should identify Error objects with additional properties', () => {
      const error = new Error('Test error') as ApiError;
      error.code = 'ERR_001';
      error.status = 400;
      error.hint = 'Try again';
      
      expect(isApiError(error)).toBe(true);
    });

    it('should reject plain Error objects without code', () => {
      const error = new Error('Test error');
      expect(isApiError(error)).toBe(false);
    });

    it('should reject non-Error objects', () => {
      const invalidErrors = [
        null,
        undefined,
        'string error',
        123,
        { message: 'Error', code: 'ERR_001' }, // not an Error instance
        [],
        {},
      ];

      invalidErrors.forEach(error => {
        expect(isApiError(error)).toBe(false);
      });
    });
  });

  describe('isPostgresError', () => {
    it('should identify Error objects with string code property', () => {
      const error = new Error('Database error') as PostgresError;
      error.code = '23505'; // unique violation
      
      expect(isPostgresError(error)).toBe(true);
    });

    it('should identify Error objects with additional Postgres properties', () => {
      const error = new Error('Database error') as PostgresError;
      error.code = '23505';
      error.detail = 'Key already exists';
      error.table = 'users';
      error.constraint = 'users_email_key';
      
      expect(isPostgresError(error)).toBe(true);
    });

    it('should reject Error objects with non-string code', () => {
      const error = new Error('Database error') as any;
      error.code = 123; // number instead of string
      
      expect(isPostgresError(error)).toBe(false);
    });

    it('should reject non-Error objects', () => {
      expect(isPostgresError(null)).toBe(false);
      expect(isPostgresError(undefined)).toBe(false);
      expect(isPostgresError({ code: '23505' })).toBe(false); // not an Error instance
    });
  });

  describe('isSupabaseError', () => {
    it('should identify objects with message property', () => {
      const error: SupabaseError = {
        message: 'Authentication failed',
      };
      
      expect(isSupabaseError(error)).toBe(true);
    });

    it('should identify objects with additional Supabase properties', () => {
      const error: SupabaseError = {
        message: 'Authentication failed',
        code: 'invalid_credentials',
        hint: 'Check your email and password',
        details: 'User not found',
      };
      
      expect(isSupabaseError(error)).toBe(true);
    });

    it('should reject null and undefined', () => {
      expect(isSupabaseError(null)).toBe(false);
      expect(isSupabaseError(undefined)).toBe(false);
    });

    it('should reject non-object types', () => {
      expect(isSupabaseError('error')).toBe(false);
      expect(isSupabaseError(123)).toBe(false);
      expect(isSupabaseError(true)).toBe(false);
      expect(isSupabaseError([])).toBe(false);
    });

    it('should reject objects without message property', () => {
      expect(isSupabaseError({})).toBe(false);
      expect(isSupabaseError({ code: 'error' })).toBe(false);
      expect(isSupabaseError({ error: 'message' })).toBe(false);
    });
  });
});