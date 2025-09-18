/**
 * Utility functions for API routes
 */

import { NextResponse } from 'next/server';
import { ApiError, PostgresError, isPostgresError } from '@/types/api';
import { isRLSError } from '@/lib/api/rls-helpers';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';

/**
 * Get environment mode (development, production, test)
 */
export const isProduction = () => {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
};

/**
 * Check if running during build phase (for static site generation)
 */
export const isBuildPhase = () => {
  return process.env.NEXT_PHASE === 'phase-production-build';
};

/**
 * Check if an error is related to database connection
 * This is used to determine when we should fall back to mock data
 */
export const isDatabaseConnectionError = (error: unknown): boolean => {
  if (!error) return false;
  
  // Check for common database connection error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ConnectionError' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code === '42P01' // Postgres undefined table error
    ) {
      return true;
    }
  }
  
  // Check for common error message patterns
  const message = error instanceof Error ? error.message : 
    (error && typeof error === 'object' && 'message' in error ? String(error.message) : '');
    
  if (message && typeof message === 'string') {
    const errorMessage = message.toLowerCase();
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('connect to database') ||
      errorMessage.includes('connect to server') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('resolve host')
    );
  }
  
  return false;
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
  if (isProduction()) {
    console.error(`API Error [${message}]:`, errorDetails);
  } else {
    console.error(`${message}:`, error);
  }
  
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

export const fetchCountries = async () => {
  try {
    const data = await apiFetchJson<{ success: boolean; data?: unknown[] }>(
      '/api/countries',
      { errorMessage: 'Failed to fetch countries', retry: 1 }
    );

    if (data?.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchProducts = async () => {
  try {
    const data = await apiFetchJson<{ success: boolean; data?: unknown[] }>(
      '/api/products',
      { errorMessage: 'Failed to fetch products', retry: 1 }
    );

    if (data?.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchClaims = async (productId: string, countryCodeValue: string) => {
  try {
    const params = new URLSearchParams();
    if (countryCodeValue) {
      params.set('countryCode', countryCodeValue);
    }

    const data = await apiFetchJson<{ success: boolean; data?: unknown; error?: string }>(
      `/api/products/${productId}/stacked-claims?${params.toString()}`,
      { errorMessage: 'Failed to fetch claims', retry: 1 }
    );

    if (data?.success) {
      return data;
    }

    return { success: false, error: data?.error || 'Failed to fetch claims.', data: [] };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { success: false, error: 'Claims not found.', data: [] };
    }
    console.error('Error fetching claims for product:', productId, 'country:', countryCodeValue, error);
    return { success: false, error: 'Failed to fetch claims.', data: [] };
  }
};
