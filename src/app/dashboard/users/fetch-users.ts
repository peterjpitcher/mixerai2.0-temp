import { apiFetchJson } from '@/lib/api-client';

type ApiUsersResponse<T> = {
  success: boolean;
  data?: T[];
  error?: string;
  pagination?: {
    total?: number;
  };
};

export interface FetchUsersPaginatedOptions<T> {
  signal?: AbortSignal;
  includeInactive?: boolean;
  perPage?: number;
  fetchPage?: (
    url: string,
    init?: Parameters<typeof apiFetchJson<ApiUsersResponse<T>>>[1]
  ) => Promise<ApiUsersResponse<T>>;
}

export interface FetchUsersPaginatedResult<T> {
  users: T[];
  error: string | null;
  aborted: boolean;
}

export async function fetchUsersPaginated<T>(
  options: FetchUsersPaginatedOptions<T> = {}
): Promise<FetchUsersPaginatedResult<T>> {
  const {
    signal,
    includeInactive = true,
    perPage = 100,
    fetchPage = (url, init) => apiFetchJson<ApiUsersResponse<T>>(url, init),
  } = options;

  const aggregated: T[] = [];
  let nextPage = 1;
  let total = Number.POSITIVE_INFINITY;
  let errorMessage: string | null = null;

  while (!signal?.aborted && aggregated.length < total) {
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(perPage),
        includeInactive: includeInactive ? 'true' : 'false',
      });

      const response = await fetchPage(`/api/users?${params.toString()}`, { signal });

      if (!response.success) {
        errorMessage = response.error || 'Failed to load users.';
        break;
      }

      const chunk = response.data ?? [];
      aggregated.push(...chunk);
      total = response.pagination?.total ?? aggregated.length;
      if (chunk.length < perPage) {
        break;
      }

      nextPage += 1;
    } catch (error) {
      if (signal?.aborted) {
        break;
      }

      errorMessage = error instanceof Error ? error.message : 'Failed to load users.';
      break;
    }
  }

  return {
    users: aggregated,
    error: signal?.aborted ? null : errorMessage,
    aborted: Boolean(signal?.aborted),
  };
}
