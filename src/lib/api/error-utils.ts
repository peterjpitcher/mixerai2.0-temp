import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Enhanced error utilities that work with the existing error-handler.ts
 */

/**
 * Type guard for PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Get appropriate HTTP status code from Postgrest error code
 */
export function getPostgrestErrorStatus(code: string): number {
  const statusMap: Record<string, number> = {
    '23505': 409, // unique_violation
    '23503': 400, // foreign_key_violation
    '23502': 400, // not_null_violation
    '23514': 400, // check_violation
    '42501': 403, // insufficient_privilege
    '42P01': 404, // undefined_table
    '42703': 400, // undefined_column
    'PGRST301': 401, // JWT expired
    'PGRST302': 401, // JWT invalid
  };
  
  return statusMap[code] || 500;
}

/**
 * Get user-friendly message from Postgrest error code
 */
export function getPostgrestErrorMessage(error: PostgrestError): string {
  const messageMap: Record<string, string> = {
    '23505': 'A record with this value already exists',
    '23503': 'Cannot complete operation due to related records',
    '23502': 'Required field is missing',
    '23514': 'Value does not meet requirements',
    '42501': 'You do not have permission to perform this action',
    '42P01': 'Resource not found',
    '42703': 'Invalid field specified',
    'PGRST301': 'Your session has expired. Please sign in again',
    'PGRST302': 'Invalid authentication token',
  };
  
  return messageMap[error.code] || error.message || 'Database operation failed';
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatZodError(error: ZodError): {
  message: string;
  details: Array<{ field: string; message: string }>;
} {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  const message = details.length === 1 
    ? details[0].message 
    : `Validation failed: ${details.length} errors found`;
  
  return { message, details };
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || message.includes('too many requests');
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') || 
           message.includes('authentication') ||
           message.includes('jwt expired');
  }
  if (isPostgrestError(error)) {
    return error.code === 'PGRST301' || error.code === 'PGRST302';
  }
  return false;
}

/**
 * Create standardized API error responses
 */
export const apiErrorResponses = {
  unauthorized: (message: string = 'Unauthorized access') => 
    NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    ),
  
  forbidden: (message: string = 'Access forbidden') =>
    NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    ),
  
  notFound: (resource: string = 'Resource') =>
    NextResponse.json(
      { 
        success: false, 
        error: `${resource} not found`,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    ),
  
  badRequest: (message: string = 'Bad request', details?: any) =>
    NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'BAD_REQUEST',
        ...(details && { details }),
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    ),
  
  conflict: (message: string = 'Resource conflict') =>
    NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'CONFLICT',
        timestamp: new Date().toISOString()
      },
      { status: 409 }
    ),
  
  serverError: (message: string = 'Internal server error') =>
    NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    ),
  
  validationError: (errors: Array<{ field: string; message: string }>) =>
    NextResponse.json(
      { 
        success: false, 
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    ),
  
  rateLimitExceeded: (retryAfter?: number) => {
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    );
    
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString());
    }
    
    return response;
  },
  
  methodNotAllowed: (allowed: string[]) => {
    const response = NextResponse.json(
      { 
        success: false, 
        error: `Method not allowed. Allowed methods: ${allowed.join(', ')}`,
        code: 'METHOD_NOT_ALLOWED',
        timestamp: new Date().toISOString()
      },
      { status: 405 }
    );
    
    response.headers.set('Allow', allowed.join(', '));
    return response;
  }
};

/**
 * Comprehensive error handler that integrates with existing error handling
 */
export function handleEnhancedApiError(error: unknown): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const { message, details } = formatZodError(error);
    return apiErrorResponses.validationError(details);
  }
  
  // Handle Postgrest errors
  if (isPostgrestError(error)) {
    const status = getPostgrestErrorStatus(error.code);
    const message = getPostgrestErrorMessage(error);
    
    if (status === 401) {
      return apiErrorResponses.unauthorized(message);
    }
    if (status === 403) {
      return apiErrorResponses.forbidden(message);
    }
    if (status === 404) {
      return apiErrorResponses.notFound();
    }
    if (status === 409) {
      return apiErrorResponses.conflict(message);
    }
    
    return apiErrorResponses.badRequest(message, { code: error.code });
  }
  
  // Handle rate limit errors
  if (isRateLimitError(error)) {
    return apiErrorResponses.rateLimitExceeded();
  }
  
  // Handle auth errors
  if (isAuthError(error)) {
    return apiErrorResponses.unauthorized();
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      return apiErrorResponses.notFound();
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return apiErrorResponses.forbidden();
    }
    if (message.includes('conflict') || message.includes('already exists')) {
      return apiErrorResponses.conflict(error.message);
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return apiErrorResponses.badRequest(error.message);
    }
    
    // Log unexpected errors
    console.error('[API Error]', error);
    return apiErrorResponses.serverError();
  }
  
  // Unknown error
  console.error('[API Error] Unknown error type:', error);
  return apiErrorResponses.serverError();
}