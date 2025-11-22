import { apiFetchJson, ApiClientError } from '@/lib/api-client';

export const fetchCountries = async () => {
    try {
        const data = await apiFetchJson<{ success: boolean; data?: unknown[] }>(
            '/api/countries',
            { errorMessage: 'Failed to fetch countries', retry: 1 }
        );

        if (!data?.success) {
            return [];
        }

        const payload = Array.isArray((data as any).countries) ? (data as any).countries : data.data;
        return Array.isArray(payload) ? payload : [];
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

        if (!data?.success) {
            return [];
        }

        return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
};

export const fetchClaims = async (productId: string, countryCodeValue: string) => {
    try {
        const normalizedProductId = productId?.trim();
        if (!normalizedProductId) {
            return { success: false, error: 'Product ID is required.', data: [] };
        }

        const params = new URLSearchParams();
        const normalizedCountryCode = countryCodeValue?.trim();
        if (normalizedCountryCode) {
            params.set('countryCode', normalizedCountryCode);
        }

        const query = params.toString();
        const url = `/api/products/${encodeURIComponent(normalizedProductId)}/stacked-claims${query ? `?${query}` : ''}`;

        const data = await apiFetchJson<{ success: boolean; data?: unknown; error?: string }>(
            url,
            { errorMessage: 'Failed to fetch claims', retry: 1 }
        );

        if (data?.success) {
            return data;
        }

        const fallbackData = Array.isArray((data as any)?.data) ? (data as any).data : [];
        return { success: false, error: data?.error || 'Failed to fetch claims.', data: fallbackData };
    } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
            return { success: false, error: 'Claims not found.', data: [] };
        }
        console.error('Error fetching claims for product:', productId, 'country:', countryCodeValue, error);
        return { success: false, error: 'Failed to fetch claims.', data: [] };
    }
};
