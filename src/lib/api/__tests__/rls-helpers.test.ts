import { NextResponse } from 'next/server';

import {
  isRLSError,
  extractTableFromRLSError,
  handleRLSError,
  validateRLSFields,
  preValidateRLSPermission,
  RLS_SAFE_OPTIONS,
} from '@/lib/api/rls-helpers';

describe('rls-helpers', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('detects RLS errors based on Postgres/PostgREST codes', () => {
    expect(isRLSError({ code: '42501' })).toBe(true);
    expect(isRLSError({ code: 'pgrst116' })).toBe(true);
    expect(isRLSError({ code: '12345' })).toBe(false);
    expect(isRLSError(new Error('no code'))).toBe(false);
  });

  it('extracts table name from RLS error messages', () => {
    const message = 'new row violates row-level security policy for table "users"';
    expect(extractTableFromRLSError({ message })).toBe('users');

    const relationMessage = 'violates row-level security policy for relation "content"';
    expect(extractTableFromRLSError({ message: relationMessage })).toBe('content');

    expect(extractTableFromRLSError({ message: 'no table mentioned' })).toBeNull();
  });

  it('returns structured forbidden response when handling RLS errors', async () => {
    const response = handleRLSError(
      { code: '42501', message: 'policy violated' },
      { operation: 'insert', table: 'content', userId: 'user-1' }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({ success: false, code: 'PERMISSION_DENIED', details: { table: 'content', operation: 'insert' } })
    );
    expect(typeof body.timestamp).toBe('string');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('rethrows when error is not an RLS violation', () => {
    expect(() => handleRLSError(new Error('other error'), { operation: 'insert' })).toThrow('other error');
  });

  it('validates required fields for known tables', () => {
    const result = validateRLSFields({ brand_id: 'b1', master_claim_brand_id: 'm1' }, 'brand_master_claim_brands');
    expect(result).toEqual({ valid: true, missingFields: [] });

    const missing = validateRLSFields({ brand_id: 'b1', master_claim_brand_id: '' }, 'brand_master_claim_brands');
    expect(missing.valid).toBe(false);
    expect(missing.missingFields).toContain('master_claim_brand_id');
  });

  describe('preValidateRLSPermission', () => {
    it('allows global admins immediately', async () => {
      await expect(
        preValidateRLSPermission({ table: 'brands', operation: 'insert', userId: 'user', isGlobalAdmin: true })
      ).resolves.toEqual({ allowed: true });
    });

    it('rejects when userId missing', async () => {
      await expect(
        preValidateRLSPermission({ table: 'brands', operation: 'select', userId: '', role: 'admin' })
      ).resolves.toEqual({ allowed: false, reason: 'User context is required for permission checks' });
    });

    it('enforces brand admin rules', async () => {
      await expect(
        preValidateRLSPermission({ table: 'brands', operation: 'update', userId: 'user', role: 'admin', brandId: 'b1' })
      ).resolves.toEqual({ allowed: true });

      await expect(
        preValidateRLSPermission({ table: 'brands', operation: 'update', userId: 'user', role: 'editor' })
      ).resolves.toEqual({ allowed: false, reason: 'Only brand admins can modify brands' });
    });

    it('allows selects for unknown tables, blocks destructive operations', async () => {
      await expect(
        preValidateRLSPermission({ table: 'unknown_table', operation: 'select', userId: 'user' })
      ).resolves.toEqual({ allowed: true });

      await expect(
        preValidateRLSPermission({ table: 'unknown_table', operation: 'insert', userId: 'user' })
      ).resolves.toEqual({ allowed: false, reason: 'Permission check not implemented for table: unknown_table' });
    });
  });

  it('swallows RLS errors in safe supabase option handler', () => {
    const result = RLS_SAFE_OPTIONS.withErrorHandling.onError({ code: '42501', message: 'blocked' });
    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalled();

    expect(() => RLS_SAFE_OPTIONS.withErrorHandling.onError(new Error('other'))).toThrow('other');
  });
});
