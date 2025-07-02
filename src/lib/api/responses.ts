import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  pagination?: PaginationMeta
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(pagination && { pagination }),
    timestamp: new Date().toISOString()
  });
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  count: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = count ? Math.ceil(count / limit) : 0;
  
  return {
    page,
    limit,
    total: count || 0,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

/**
 * Extract pagination parameters from URL search params
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 20
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || String(defaultLimit), 10)));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}