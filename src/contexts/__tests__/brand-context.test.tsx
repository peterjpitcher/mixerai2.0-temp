import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { BrandProvider, useBrands } from '../brand-context';
import { useAuth } from '../auth-context';
import { apiFetchJson } from '@/lib/api-client';

jest.mock('../auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiFetchJson: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedApiFetchJson = apiFetchJson as jest.MockedFunction<typeof apiFetchJson>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>{children}</BrandProvider>
    </QueryClientProvider>
  );

  return { wrapper, queryClient };
}

describe('BrandProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
      },
      isLoading: false,
      error: null,
      signOut: jest.fn(),
      refreshUser: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    mockedApiFetchJson.mockImplementation(async (url: RequestInfo | URL) => {
      const target = typeof url === 'string' ? url : url.toString();

      if (target === '/api/brands') {
        return {
          success: true,
          data: [
            { id: 'brand-1', name: 'Bravo' },
            { id: 'brand-2', name: 'Delta' },
          ],
        };
      }

      if (target.startsWith('/api/brands/')) {
        const brandId = target.replace('/api/brands/', '');
        return {
          success: true,
          brand: {
            id: brandId,
            name: brandId === 'brand-1' ? 'Bravo' : 'Delta',
            brand_color: '#123456',
          },
        };
      }

      throw Object.assign(new Error('Not found'), { status: 404 });
    });
  });

  afterEach(() => {
    mockedApiFetchJson.mockReset();
  });

  it('loads brands and selects the first brand when none is persisted', async () => {
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => expect(result.current.brands).toHaveLength(2));
    expect(result.current.activeBrand?.id).toBe('brand-1');
    expect(localStorage.getItem('mixerai-active-brand')).toBe('brand-1');

    queryClient.clear();
  });

  it('updates the active brand when setActiveBrandId is invoked', async () => {
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => expect(result.current.activeBrand?.id).toBe('brand-1'));

    await act(async () => {
      result.current.setActiveBrandId('brand-2');
    });

    await waitFor(() => expect(result.current.activeBrand?.id).toBe('brand-2'));
    expect(localStorage.getItem('mixerai-active-brand')).toBe('brand-2');

    queryClient.clear();
  });
});
