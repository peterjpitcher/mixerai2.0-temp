import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * RLS (Row Level Security) helper functions and utilities
 */

/**
 * Check if an error is an RLS policy violation
 */
export function isRLSError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : undefined;

  // 42501 is the PostgreSQL error code for insufficient_privilege
  // PGRST116 is PostgREST's code for RLS violations
  return code === '42501' || code === 'PGRST116';
}

/**
 * Detect PostgreSQL's "infinite recursion" policy error so API routes can fall back gracefully
 * while migrations are catching up.
 */
export function isRecursivePolicyError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : undefined;
  if (code === '42P17') {
    return true;
  }

  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  return message.includes('infinite recursion');
}

/**
 * Extract table name from RLS error message
 */
export function extractTableFromRLSError(error: PostgrestError | { message?: string }): string | null {
  const message = typeof error.message === 'string' ? error.message : '';
  if (!message) return null;

  const patterns = [
    /for table "([^"]+)"/i,
    /for relation "([^"]+)"/i,
    /policy for "([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Handle RLS errors with appropriate logging and response
 */
export function handleRLSError(
  error: unknown,
  context: {
    operation: 'insert' | 'update' | 'delete' | 'select';
    table?: string;
    userId?: string;
    additionalContext?: Record<string, unknown>;
  }
): NextResponse {
  if (!isRLSError(error)) {
    // Not an RLS error, let other error handlers deal with it
    throw error;
  }

  const pgError = error as PostgrestError;
  const table = context.table || extractTableFromRLSError(pgError) || 'unknown';
  const logPayload = {
    table,
    operation: context.operation,
    userId: context.userId,
    errorCode: pgError.code,
    errorMessage: pgError.message,
    hint: pgError.hint,
    details: pgError.details,
    ...context.additionalContext,
  };

  console.error('[RLS Policy Violation]', logPayload);

  // Return user-friendly error message
  return NextResponse.json(
    {
      success: false,
      error: 'You do not have permission to perform this action.',
      code: 'PERMISSION_DENIED',
      details: { table, operation: context.operation },
      timestamp: new Date().toISOString(),
    },
    { status: 403 }
  );
}

/**
 * Validate required fields for RLS policies before insert/update
 */
export function validateRLSFields(
  data: Record<string, unknown>,
  table: string
): { valid: boolean; missingFields: string[] } {
  const requiredFields: Record<string, string[]> = {
    'brand_master_claim_brands': ['brand_id', 'master_claim_brand_id'],
    'user_brand_permissions': ['user_id', 'brand_id', 'role'],
    'content': ['brand_id', 'created_by'],
    'workflows': ['brand_id', 'created_by'],
    'content_templates': ['brand_id', 'created_by'],
    'tool_run_history': ['user_id', 'tool_name'],
    'notifications': ['user_id'],
    'user_tasks': ['created_by'],
    'workflow_invitations': ['workflow_id', 'invited_by']
  };

  const required = requiredFields[table] || [];
  const missingFields = required.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(data, field)) {
      return true;
    }
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Pre-validate RLS permissions before attempting database operation
 * This helps provide better error messages and avoid hitting RLS policies
 */
export async function preValidateRLSPermission(
  params: {
    table: string;
    operation: 'insert' | 'update' | 'delete' | 'select';
    userId: string;
    brandId?: string;
    role?: string;
    isGlobalAdmin?: boolean;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const { table, operation, userId, brandId, role, isGlobalAdmin } = params;

  // Global admins typically have full access
  if (isGlobalAdmin) {
    return { allowed: true };
  }

  if (!userId) {
    return { allowed: false, reason: 'User context is required for permission checks' };
  }

  // Table-specific permission logic
  switch (table) {
    case 'brands':
      if (operation === 'insert') {
        return { 
          allowed: !!isGlobalAdmin, 
          reason: 'Only global admins can create brands' 
        };
      }
      if (operation === 'update' || operation === 'delete') {
        const isBrandAdmin = role === 'admin' && Boolean(brandId);
        return isBrandAdmin
          ? { allowed: true }
          : { allowed: false, reason: 'Only brand admins can modify brands' };
      }
      return { allowed: true }; // SELECT is public

    case 'content':
      if (operation === 'select') {
        return { allowed: true }; // Public read
      }
      if (operation === 'insert' || operation === 'update') {
        const hasPermission = role === 'admin' || role === 'editor';
        return hasPermission
          ? { allowed: true }
          : { allowed: false, reason: 'Only admins and editors can modify content' };
      }
      if (operation === 'delete') {
        return role === 'admin'
          ? { allowed: true }
          : { allowed: false, reason: 'Only admins can delete content' };
      }
      break;

    case 'user_brand_permissions':
      return {
        allowed: !!isGlobalAdmin,
        reason: 'Only global admins can manage user permissions'
      };

    case 'tool_run_history':
      // Users can only access their own history
      return { allowed: true };

    default:
      if (operation === 'select') {
        // Allow reads for unhandled tables – rely on RLS as the ultimate guard
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Permission check not implemented for table: ${table}`
      };
  }

  return { allowed: false, reason: 'Permission denied' };
}

/**
 * Options for Supabase operations to handle RLS issues
 */
export const RLS_SAFE_OPTIONS = {
  // Use when you don't need the inserted/updated data back
  insertMinimal: { returning: 'minimal' as const },
  
  // Use when you need to check if operation succeeded without data
  updateMinimal: { returning: 'minimal' as const },
  
  // Use for operations that might fail due to RLS
  withErrorHandling: {
    onError: (error: unknown) => {
      if (isRLSError(error)) {
        console.warn('RLS policy prevented operation:', {
          code: (error as PostgrestError).code,
          message: (error as PostgrestError).message,
        });
        return null;
      }
      throw error;
    }
  }
};
