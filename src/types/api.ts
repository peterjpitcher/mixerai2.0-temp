/**
 * Common API types to replace 'any' usage
 */

// Standard API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  code?: string;
  hint?: string;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Error types
export interface ApiError extends Error {
  code?: string;
  hint?: string;
  details?: string;
  status?: number;
}

export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  routine?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

// Supabase specific error
export interface SupabaseError {
  message: string;
  code?: string;
  hint?: string;
  details?: string;
}

// Request body types
export interface WithUserId {
  userId: string;
}

export interface WithBrandId {
  brandId: string;
}

// Type guards
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'code' in error;
}

export function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && 
    'code' in error && 
    typeof (error as any).code === 'string';
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return error !== null && 
    typeof error === 'object' && 
    'message' in error;
}

// Generic database record types
export interface DatabaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface WithTimestamps {
  created_at: string;
  updated_at: string;
}

// Utility type to make all properties of T optional except the ones in K
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Utility type for form data
export type FormDataRecord = Record<string, string | number | boolean | null | undefined>;

// Type for unknown JSON data that needs validation
export type UnknownJson = Record<string, unknown> | unknown[] | string | number | boolean | null;