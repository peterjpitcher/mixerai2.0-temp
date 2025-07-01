/**
 * Supabase query builder utilities
 * These functions help build consistent queries across the application
 */

/**
 * Apply brand filter to a query
 */
export function withBrandFilter(
  query: any,
  brandIds: string | string[]
): any {
  if (Array.isArray(brandIds)) {
    return query.in('brand_id', brandIds);
  }
  return query.eq('brand_id', brandIds);
}

/**
 * Apply pagination to a query
 */
export function withPagination(
  query: any,
  offset: number,
  limit: number
): any {
  return query.range(offset, offset + limit - 1);
}

/**
 * Apply common sorting patterns
 */
export function withSorting(
  query: any,
  column: string = 'created_at',
  ascending: boolean = false
): any {
  return query.order(column, { ascending });
}

/**
 * Apply date range filter
 */
export function withDateRange(
  query: any,
  column: string,
  startDate?: Date | string,
  endDate?: Date | string
): any {
  let result = query;
  
  if (startDate) {
    result = result.gte(column, startDate instanceof Date ? startDate.toISOString() : startDate);
  }
  
  if (endDate) {
    result = result.lte(column, endDate instanceof Date ? endDate.toISOString() : endDate);
  }
  
  return result;
}

/**
 * Apply status filter
 */
export function withStatusFilter(
  query: any,
  status: string | string[],
  column: string = 'status'
): any {
  if (Array.isArray(status)) {
    return query.in(column, status);
  }
  return query.eq(column, status);
}

/**
 * Apply search filter across multiple columns
 */
export function withSearchFilter(
  query: any,
  search: string,
  columns: string[]
): any {
  if (!search || columns.length === 0) return query;
  
  // Create OR conditions for each column
  const conditions = columns.map(col => `${col}.ilike.%${search}%`).join(',');
  return query.or(conditions);
}

/**
 * Count total records (for pagination)
 */
export async function getCount(
  query: any
): Promise<number> {
  const { count, error } = await query.select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error getting count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Apply soft delete filter (exclude deleted records)
 */
export function withSoftDeleteFilter(
  query: any,
  deletedColumn: string = 'deleted_at',
  includeDeleted: boolean = false
): any {
  if (includeDeleted) return query;
  return query.is(deletedColumn, null);
}

/**
 * Apply user filter
 */
export function withUserFilter(
  query: any,
  userId: string,
  column: string = 'user_id'
): any {
  return query.eq(column, userId);
}

/**
 * Build a complex query with common patterns
 */
export interface QueryOptions {
  brandIds?: string | string[];
  userId?: string;
  status?: string | string[];
  search?: string;
  searchColumns?: string[];
  sortColumn?: string;
  sortAscending?: boolean;
  includeDeleted?: boolean;
  pagination?: {
    offset: number;
    limit: number;
  };
  dateRange?: {
    column: string;
    startDate?: Date | string;
    endDate?: Date | string;
  };
}

export function buildQuery(
  baseQuery: any,
  options: QueryOptions
): any {
  let query = baseQuery;
  
  // Apply filters in order
  if (options.brandIds) {
    query = withBrandFilter(query, options.brandIds);
  }
  
  if (options.userId) {
    query = withUserFilter(query, options.userId);
  }
  
  if (options.status) {
    query = withStatusFilter(query, options.status);
  }
  
  if (options.search && options.searchColumns) {
    query = withSearchFilter(query, options.search, options.searchColumns);
  }
  
  if (options.dateRange) {
    query = withDateRange(
      query,
      options.dateRange.column,
      options.dateRange.startDate,
      options.dateRange.endDate
    );
  }
  
  // Apply soft delete filter
  query = withSoftDeleteFilter(query, 'deleted_at', options.includeDeleted);
  
  // Apply sorting
  if (options.sortColumn) {
    query = withSorting(query, options.sortColumn, options.sortAscending);
  }
  
  // Apply pagination last
  if (options.pagination) {
    query = withPagination(query, options.pagination.offset, options.pagination.limit);
  }
  
  return query;
}