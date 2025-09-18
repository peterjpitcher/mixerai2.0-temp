import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useBrandProducts } from '../use-brand-products';
import { apiFetchJson } from '@/lib/api-client';

type ApiFetchJson = typeof apiFetchJson;

jest.mock('@/lib/api-client', () => ({
  apiFetchJson: jest.fn(),
}));

const mockedApiFetchJson = apiFetchJson as jest.MockedFunction<ApiFetchJson>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
}

describe('useBrandProducts', () => {
  afterEach(() => {
    mockedApiFetchJson.mockReset();
  });

  it('fetches and sorts products for a brand', async () => {
    mockedApiFetchJson.mockResolvedValue({
      success: true,
      products: [
        { id: 'product-2', name: 'Zeta' },
        { id: 'product-1', name: 'Alpha' },
      ],
    });

    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useBrandProducts({ brandId: 'brand-123' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: 'product-1', name: 'Alpha' },
      { id: 'product-2', name: 'Zeta' },
    ]);
    expect(mockedApiFetchJson).toHaveBeenCalledWith('/api/brands/brand-123/products?limit=200', {
      errorMessage: 'Failed to load products',
    });

    queryClient.clear();
  });

  it('does not fire when brandId is missing', () => {
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useBrandProducts({ brandId: null }),
      { wrapper }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockedApiFetchJson).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('surfaces API errors', async () => {
    mockedApiFetchJson.mockResolvedValue({ success: false, error: 'Nope' });

    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useBrandProducts({ brandId: 'brand-123' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toContain('Nope');

    queryClient.clear();
  });
});
