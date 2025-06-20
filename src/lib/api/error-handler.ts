import { NextResponse } from 'next/server';
import { ERROR_MESSAGES, getErrorMessage, formatApiError } from '@/lib/constants/error-messages';

interface StandardErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

interface StandardSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export type StandardApiResponse<T = unknown> = StandardSuccessResponse<T> | StandardErrorResponse;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage: keyof typeof ERROR_MESSAGES = 'GENERIC_ERROR',
  status: number = 500
): NextResponse<StandardErrorResponse> {
  const errorMessage = formatApiError(error) || getErrorMessage(fallbackMessage);
  
  console.error(`[API Error] ${errorMessage}:`, error);
  
  return NextResponse.json(
    { 
      success: false, 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        details: error.message
      })
    },
    { status }
  );
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
      ...(message && { message })
    },
    { status }
  );
}

/**
 * Map database/API errors to appropriate HTTP status codes
 */
export function getErrorStatus(error: unknown): number {
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
  const status = getErrorStatus(error);
  return createErrorResponse(error, fallbackKey, status);
}