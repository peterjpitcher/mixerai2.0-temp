import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/api-client';

export interface BrandProductSummary {
  id: string;
  name: string;
}

interface UseBrandProductsOptions {
  brandId?: string | null;
  searchTerm?: string;
  limit?: number;
  enabled?: boolean;
}

interface BrandProductsResponse {
  success: boolean;
  products?: BrandProductSummary[];
  error?: string;
}

const brandProductsQueryKey = (
  brandId: string | null | undefined,
  searchTerm: string | undefined,
  limit: number
) => ['brand-products', brandId ?? 'none', searchTerm ?? '', limit] as const;

export function useBrandProducts({
  brandId,
  searchTerm,
  limit = 200,
  enabled = true,
}: UseBrandProductsOptions) {
  return useQuery<BrandProductSummary[]>({
    queryKey: brandProductsQueryKey(brandId, searchTerm, limit),
    queryFn: async () => {
      if (!brandId) {
        return [];
      }

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (searchTerm) {
        params.set('q', searchTerm);
      }

      const data = await apiFetchJson<BrandProductsResponse>(
        `/api/brands/${brandId}/products?${params.toString()}`,
        {
          errorMessage: 'Failed to load products',
        }
      );

      if (!data.success || !Array.isArray(data.products)) {
        throw new Error(data.error || 'Invalid products payload');
      }

      return [...data.products].sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: Boolean(brandId) && enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export type UseBrandProductsReturn = ReturnType<typeof useBrandProducts>;
