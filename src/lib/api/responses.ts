import { NextResponse } from 'next/server';
import type { ErrorMessageKey } from '@/lib/constants/error-messages';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
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
  options: {
    pagination?: PaginationMeta;
    message?: string;
    status?: number;
    headers?: HeadersInit;
  } = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { pagination, message, status = 200, headers } = options;

  return NextResponse.json(
    {
      success: true,
      data,
      ...(pagination && { pagination }),
      ...(message && { message }),
      timestamp: new Date().toISOString(),
    },
    { status, headers }
  );
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  options: {
    status?: number;
    code?: string;
    details?: unknown;
    headers?: HeadersInit;
    fallbackKey?: ErrorMessageKey;
  } = {}
): NextResponse<ApiErrorResponse> {
  const {
    status = 500,
    code = options.fallbackKey ?? 'SERVER_ERROR',
    details,
    headers,
  } = options;

  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(typeof details !== 'undefined' && { details }),
      timestamp: new Date().toISOString(),
    },
    { status, headers }
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
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const limitParam = Number.parseInt(searchParams.get('limit') ?? String(defaultLimit), 10);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(100, limitParam) : defaultLimit;

  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}
