import { NextResponse } from 'next/server';
import { ERROR_MESSAGES, getErrorMessage, formatApiError } from '@/lib/constants/error-messages';
import { ApiClientError } from '@/lib/api-client';

interface StandardErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  details?: unknown;
  [key: string]: unknown;
}

interface StandardSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

export type StandardApiResponse<T = unknown> = StandardSuccessResponse<T> | StandardErrorResponse;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage: keyof typeof ERROR_MESSAGES = 'GENERIC_ERROR',
  status?: number,
  options: {
    code?: string;
    includeDetails?: boolean;
    headers?: HeadersInit;
    extra?: Record<string, unknown>;
  } = {}
): NextResponse<StandardErrorResponse> {
  const evaluatedStatus = typeof status === 'number' ? status : getErrorStatus(error);
  const errorMessage = formatApiError(error) || getErrorMessage(fallbackMessage);
  const derivedCode =
    options.code ||
    (typeof (error as { code?: unknown })?.code === 'string' ? String((error as { code?: unknown }).code) : fallbackMessage);

  const shouldIncludeDetails =
    options.includeDetails ?? process.env.NODE_ENV === 'development';

  const responseBody: StandardErrorResponse = {
    success: false,
    error: errorMessage,
    code: derivedCode,
    timestamp: new Date().toISOString(),
  };

  if (shouldIncludeDetails && error instanceof Error) {
    responseBody.details = error.message;
  } else if (shouldIncludeDetails && typeof error === 'string') {
    responseBody.details = error;
  }

  if (options.extra) {
    Object.assign(responseBody, options.extra);
  }

  console.error('[API Error]', { message: errorMessage, status: evaluatedStatus, error });

  return NextResponse.json(responseBody, {
    status: evaluatedStatus,
    headers: options.headers,
  });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T = unknown>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<StandardSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Map database/API errors to appropriate HTTP status codes
 */
export function getErrorStatus(error: unknown): number {
  if (error instanceof ApiClientError) {
    return error.status;
  }

  if (error instanceof Response) {
    return error.status;
  }

  if (error && typeof error === 'object') {
    const candidate = error as { status?: unknown; statusCode?: unknown };
    const status = candidate.status ?? candidate.statusCode;
    if (typeof status === 'number' && status >= 100) {
      return status;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('auth')) {
      return 401;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return 403;
    }
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('conflict') || message.includes('already exists')) {
      return 409;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 400;
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return 429;
    }
  }
  
  return 500;
}

/**
 * Improved handleApiError that uses standardized messages
 */
export function handleStandardApiError(
  error: unknown,
  fallbackKey: keyof typeof ERROR_MESSAGES = 'GENERIC_ERROR'
): NextResponse<StandardErrorResponse> {
  return createErrorResponse(error, fallbackKey);
}
