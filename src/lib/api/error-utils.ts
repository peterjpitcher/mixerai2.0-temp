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
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.details === 'string'
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
  
  const normalizedCode = code?.toUpperCase?.() ?? '';
  return statusMap[normalizedCode] || 500;
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
  
  const normalizedCode = error.code?.toUpperCase?.() ?? '';
  const mappedMessage = messageMap[normalizedCode];
  if (mappedMessage) {
    return mappedMessage;
  }

  return error.message || error.details || error.hint || 'Database operation failed';
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatZodError(error: ZodError): {
  message: string;
  details: Array<{ field: string; message: string }>;
} {
  const details = error.errors.map((err) => ({
    field: err.path.length ? err.path.join('.') : 'root',
    message: err.message,
  }));

  const uniqueMessages = Array.from(new Set(details.map((item) => item.message)));
  const message = details.length === 1
    ? details[0].message
    : `Validation failed (${details.length} issues): ${uniqueMessages.join('; ')}`;

  return { message, details };
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (typeof (error as { status?: unknown }).status === 'number') {
    const status = Number((error as { status?: unknown }).status);
    if (status === 429) {
      return true;
    }
  }

  const messageSource =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : '';

  if (!messageSource) {
    return false;
  }

  const message = messageSource.toLowerCase();
  return message.includes('rate limit') || message.includes('too many requests') || message.includes('429');
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false;

  if (typeof (error as { status?: unknown }).status === 'number') {
    const status = Number((error as { status?: unknown }).status);
    if (status === 401 || status === 419) {
      return true;
    }
  }

  if (isPostgrestError(error)) {
    const code = error.code?.toUpperCase?.();
    return code === 'PGRST301' || code === 'PGRST302';
  }

  const messageSource =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : '';

  if (!messageSource) {
    return false;
  }

  const message = messageSource.toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('jwt expired') ||
    message.includes('invalid token')
  );
}

/**
 * Create standardized API error responses
 */
type ErrorResponseBody = {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  details?: unknown;
};

function buildErrorResponse(
  error: string,
  code: string,
  status: number,
  options: { details?: unknown; headers?: HeadersInit } = {}
) {
  const body: ErrorResponseBody = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString(),
  };

  if (typeof options.details !== 'undefined') {
    body.details = options.details;
  }

  return NextResponse.json(body, {
    status,
    headers: options.headers,
  });
}

export const apiErrorResponses = {
  unauthorized: (message: string = 'Unauthorized access') =>
    buildErrorResponse(message, 'UNAUTHORIZED', 401),
  
  forbidden: (message: string = 'Access forbidden') =>
    buildErrorResponse(message, 'FORBIDDEN', 403),
  
  notFound: (message: string = 'Resource not found') =>
    buildErrorResponse(message, 'NOT_FOUND', 404),
  
  badRequest: (message: string = 'Bad request', details?: any) =>
    buildErrorResponse(message, 'BAD_REQUEST', 400, { details }),
  
  conflict: (message: string = 'Resource conflict') =>
    buildErrorResponse(message, 'CONFLICT', 409),
  
  serverError: (message: string = 'Internal server error') =>
    buildErrorResponse(message, 'SERVER_ERROR', 500),
  
  validationError: (errors: Array<{ field: string; message: string }>) =>
    buildErrorResponse('Validation failed', 'VALIDATION_ERROR', 400, { details: errors }),
  
  rateLimitExceeded: (retryAfter?: number) => {
    const response = buildErrorResponse('Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED', 429);
    
    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0) {
      response.headers.set('Retry-After', Math.ceil(retryAfter).toString());
    }
    
    return response;
  },
  
  methodNotAllowed: (allowed: string[]) => {
    const normalizedMethods = Array.from(
      new Set(
        allowed
          .map((method) => method?.trim().toUpperCase())
          .filter((method): method is string => Boolean(method))
      )
    );

    const message = normalizedMethods.length
      ? `Method not allowed. Allowed methods: ${normalizedMethods.join(', ')}`
      : 'Method not allowed.';

    const response = buildErrorResponse(message, 'METHOD_NOT_ALLOWED', 405);

    if (normalizedMethods.length) {
      response.headers.set('Allow', normalizedMethods.join(', '));
    }

    return response;
  }
};

/**
 * Comprehensive error handler that integrates with existing error handling
 */
export function handleEnhancedApiError(error: unknown): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const { details } = formatZodError(error);
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
      return apiErrorResponses.notFound(message);
    }
    if (status === 409) {
      return apiErrorResponses.conflict(message);
    }
    
    return apiErrorResponses.badRequest(message, {
      code: error.code,
      details: error.details || undefined,
      hint: error.hint || undefined,
    });
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
    const rawMessage = error.message;
    const lowerCased = rawMessage.toLowerCase();
    
    if (lowerCased.includes('not found')) {
      return apiErrorResponses.notFound();
    }
    if (lowerCased.includes('forbidden') || lowerCased.includes('permission')) {
      return apiErrorResponses.forbidden();
    }
    if (lowerCased.includes('conflict') || lowerCased.includes('already exists')) {
      return apiErrorResponses.conflict(rawMessage);
    }
    if (lowerCased.includes('validation') || lowerCased.includes('invalid')) {
      return apiErrorResponses.badRequest(rawMessage);
    }
    
    // Log unexpected errors
    console.error('[API Error]', error);
    return apiErrorResponses.serverError();
  }
  
  // Unknown error
  console.error('[API Error] Unknown error type:', error);
  return apiErrorResponses.serverError();
}
