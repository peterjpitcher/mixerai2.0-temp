import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * RLS (Row Level Security) helper functions and utilities
 */

/**
 * Check if an error is an RLS policy violation
 */
export function isRLSError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const pgError = error as PostgrestError;
  // 42501 is the PostgreSQL error code for insufficient_privilege
  // PGRST116 is PostgREST's code for RLS violations
  return pgError.code === '42501' || pgError.code === 'PGRST116';
}

/**
 * Extract table name from RLS error message
 */
export function extractTableFromRLSError(error: PostgrestError): string | null {
  if (!error.message) return null;
  
  // Match patterns like "new row violates row-level security policy for table "users""
  const match = error.message.match(/for table "([^"]+)"/);
  return match ? match[1] : null;
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
  
  console.error('[RLS Policy Violation]', {
    table,
    operation: context.operation,
    userId: context.userId,
    errorCode: pgError.code,
    errorMessage: pgError.message,
    hint: pgError.hint,
    details: pgError.details,
    ...context.additionalContext
  });

  // Return user-friendly error message
  return NextResponse.json(
    {
      success: false,
      error: 'You do not have permission to perform this action.',
      code: 'PERMISSION_DENIED'
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
  const missingFields = required.filter(field => !data[field]);

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
        return {
          allowed: role === 'admin' && brandId !== undefined,
          reason: 'Only brand admins can modify brands'
        };
      }
      return { allowed: true }; // SELECT is public

    case 'content':
      if (operation === 'select') {
        return { allowed: true }; // Public read
      }
      if (operation === 'insert' || operation === 'update') {
        return {
          allowed: role === 'admin' || role === 'editor',
          reason: 'Only admins and editors can modify content'
        };
      }
      if (operation === 'delete') {
        return {
          allowed: role === 'admin',
          reason: 'Only admins can delete content'
        };
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
      // For unknown tables, be conservative
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
        console.warn('RLS policy prevented operation:', error);
        return null;
      }
      throw error;
    }
  }
};