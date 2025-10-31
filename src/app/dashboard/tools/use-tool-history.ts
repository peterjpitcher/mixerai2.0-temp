'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '@/lib/api-client';

export interface ToolRunHistoryRecord {
  id: string;
  user_id: string;
  tool_name: string;
  brand_id?: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  run_at: string;
  status: 'success' | 'failure';
  error_message?: string | null;
  batch_id?: string | null;
  batch_sequence?: number | null;
}

interface ToolRunHistoryResponse {
  success: boolean;
  history?: ToolRunHistoryRecord[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total?: number;
  };
}

export interface UseToolHistoryOptions<T> {
  enabled?: boolean;
  pageSize?: number;
  transform?: (records: ToolRunHistoryRecord[]) => T[];
  filters?: ToolHistoryFilters;
}

export interface UseToolHistoryResult<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  page: number;
}

const DEFAULT_PAGE_SIZE = 20;

export interface ToolHistoryFilters {
  status?: 'success' | 'failure';
  brandId?: string;
}

export function useToolHistory<T = ToolRunHistoryRecord>(
  toolName: string,
  options: UseToolHistoryOptions<T> = {}
): UseToolHistoryResult<T> {
  const {
    enabled = true,
    pageSize = DEFAULT_PAGE_SIZE,
    transform,
    filters,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapper = useMemo(
    () =>
      transform ??
      ((records: ToolRunHistoryRecord[]) => records as unknown as T[]),
    [transform]
  );

  const serializedFilters = useMemo(
    () => JSON.stringify(filters ?? {}),
    [filters]
  );

  const fetchPage = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (!enabled) {
        if (!append) {
          setItems([]);
          setHasMore(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          tool_name: toolName,
          page: pageToFetch.toString(),
          limit: pageSize.toString(),
        });

        if (filters?.status) {
          params.set('status', filters.status);
        }

        if (filters?.brandId) {
          params.set('brand_id', filters.brandId);
        }

        const data = await apiFetchJson<ToolRunHistoryResponse>(
          `/api/me/tool-run-history?${params.toString()}`
        );

        if (data.success && Array.isArray(data.history)) {
          const mapped = mapper(data.history);
          setItems(prev => (append ? [...prev, ...mapped] : mapped));

          const pagination = data.pagination ?? {
            page: pageToFetch,
            limit: pageSize,
            total: data.history.length,
          };
          const total = pagination.total ?? data.history.length;
          setPage(pagination.page);
          setHasMore(pagination.page * pagination.limit < total);
        } else {
          if (!append) {
            setItems([]);
            setHasMore(false);
            setPage(1);
          }
          setError(data.error || 'History data not found.');
        }
      } catch (err) {
        if (!append) {
          setItems([]);
          setHasMore(false);
          setPage(1);
        }
        setError(err instanceof Error ? err.message : 'Failed to load history.');
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, filters, mapper, pageSize, toolName]
  );

  const refresh = useCallback(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    void fetchPage(page + 1, true);
  }, [fetchPage, page]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setHasMore(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    void fetchPage(1, false);
  }, [enabled, fetchPage, serializedFilters]);

  return {
    items,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    page,
  };
}
