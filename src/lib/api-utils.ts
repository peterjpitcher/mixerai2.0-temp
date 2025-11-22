/**
 * Utility functions for API routes
 */

import { NextResponse } from 'next/server';
import { isPostgresError } from '@/types/api';
import { isRLSError } from '@/lib/api/rls-helpers';
import { isProduction, isBuildPhase } from '@/lib/env';

// Re-export environment helpers
export { isProduction, isBuildPhase };

// Re-export client services
export * from '@/lib/api/client-services';

const NODE_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
]);

const POSTGRES_CONNECTION_ERROR_CODES = new Set([
  '08001', // sqlclient unable to establish connection
  '08003', // connection does not exist
  '08004', // server rejected the connection
  '08006', // connection failure
  '08007', // transaction resolution unknown
  '57P01', // admin shutdown
  '57P02', // crash shutdown
  '57P03', // cannot connect now
  '53300', // too many connections
  '57P05', // idle session timeout
]);

const CONNECTION_MESSAGE_PATTERNS: RegExp[] = [
  /connection (?:refused|timed? out|reset)/i,
  /connect(?:ion)? to (?:server|database) (?:refused|failed|lost)/i,
  /could not connect to server/i,
  /remaining connection slots are reserved/i,
  /no pg_hba\.conf entry/i,
  /password authentication failed/i,
  /terminating connection due to administrator command/i,
];

/**
 * Check if an error is related to database connection
 * This is used to determine when we should fall back to mock data
 */
export const isDatabaseConnectionError = (error: unknown): boolean => {
  if (!error) return false;

  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String((error as { code?: unknown }).code) : undefined;
    if (code && (NODE_CONNECTION_ERROR_CODES.has(code) || POSTGRES_CONNECTION_ERROR_CODES.has(code))) {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : '';

  if (!message) {
    return false;
  }

  return CONNECTION_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Safely handle database errors, with special handling for build/SSG
 */
export const handleApiError = (
  error: unknown,
  message: string = 'An error occurred',
  status: number = 500
): NextResponse => {
  // Enhanced error object for logging
  const errorDetails = {
    message: 'Unknown error',
    code: 'UNKNOWN',
    hint: '',
    source: 'unknown',
    isDatabaseError: false
  };

  if (error instanceof Error) {
    errorDetails.message = error.message;
    if (isPostgresError(error)) {
      errorDetails.code = error.code || 'UNKNOWN';
      errorDetails.hint = error.hint || '';
    } else if ('code' in error && typeof error.code === 'string') {
      errorDetails.code = error.code;
    }
    if ('hint' in error && typeof error.hint === 'string') {
      errorDetails.hint = error.hint;
    }
  } else if (error && typeof error === 'object') {
    if ('message' in error && error.message) {
      errorDetails.message = String(error.message);
    } else if ('error' in error && error.error) {
      errorDetails.message = String(error.error);
    }
    if ('code' in error) errorDetails.code = String((error as { code?: unknown }).code);
    if ('hint' in error) errorDetails.hint = String((error as { hint?: unknown }).hint);
    if ('source' in error) errorDetails.source = String((error as { source?: unknown }).source);
  } else if (typeof error === 'string') {
    errorDetails.message = error;
  } else if (typeof error === 'number' || typeof error === 'boolean') {
    errorDetails.message = String(error);
  }

  errorDetails.isDatabaseError = isDatabaseConnectionError(error);

  // Log the full error in development, but a sanitized version in production
  const logPayload = isProduction() ? errorDetails : error;
  console.error(`[API Error] ${message}`, logPayload);

  // During static site generation, we return an empty success
  // to prevent build errors with database connections
  if (isBuildPhase()) {
    console.log('Returning mock data during build phase');
    return NextResponse.json({
      success: true,
      isMockData: true,
      data: []
    });
  }

  // If this is a database connection error, provide a more helpful response
  if (isDatabaseConnectionError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection error. Please try again later.',
        isFallback: true,
      },
      { status: 503 } // Service Unavailable
    );
  }

  // Check for RLS (Row Level Security) errors
  if (isRLSError(error)) {
    console.error('[RLS Policy Violation]', {
      message,
      errorDetails,
      originalError: error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to perform this action.',
        code: 'PERMISSION_DENIED',
        details: isProduction() ? undefined : errorDetails.message
      },
      { status: 403 } // Forbidden
    );
  }

  // Otherwise return the actual error
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: isProduction() ? 'See server logs for details' : errorDetails.message,
      hint: errorDetails.hint,
      code: errorDetails.code
    },
    { status }
  );
};
