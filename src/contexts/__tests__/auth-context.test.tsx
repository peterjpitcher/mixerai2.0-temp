import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { apiFetchJson } from '@/lib/api-client';

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/api-client', () => {
  class MockApiClientError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
      this.name = 'ApiClientError';
    }
  }

  return {
    apiFetchJson: jest.fn(),
    ApiClientError: MockApiClientError,
  };
});

const mockedCreateSupabaseClient = createSupabaseClient as jest.MockedFunction<typeof createSupabaseClient>;
const mockedApiFetchJson = apiFetchJson as jest.MockedFunction<typeof apiFetchJson>;

type AuthListener = (event: string, session: unknown) => void;

function createWrapper(listenerRef: { current: AuthListener | null }) {
  const mockGetUser = jest.fn().mockResolvedValue({
    data: {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        user_metadata: { role: 'editor' },
      },
    },
    error: null,
  });

  const mockSignOut = jest.fn().mockResolvedValue({ error: null });

  const mockOnAuthStateChange = jest.fn((callback: AuthListener) => {
    listenerRef.current = callback;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });

  mockedCreateSupabaseClient.mockReturnValue({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  } as unknown as ReturnType<typeof createSupabaseClient>);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  return { wrapper, queryClient, mockGetUser, mockSignOut, mockOnAuthStateChange };
}

describe('AuthProvider', () => {
  const listenerRef = { current: null as AuthListener | null };

  beforeEach(() => {
    listenerRef.current = null;
    mockedApiFetchJson.mockResolvedValue({
      success: true,
      user: {
        id: 'user-123',
        user_metadata: { role: 'editor', full_name: 'Test User' },
        brand_permissions: [{ brand_id: 'brand-1', role: 'admin' }],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseClient.mockReset();
    mockedApiFetchJson.mockReset();
  });

  it('exposes hydrated auth state from Supabase and /api/me', async () => {
    const { wrapper, queryClient } = createWrapper(listenerRef);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.brand_permissions).toEqual([
      { brand_id: 'brand-1', role: 'admin' },
    ]);
    expect(result.current.error).toBeNull();

    queryClient.clear();
  });

  it('clears cached user data on SIGNED_OUT events', async () => {
    const { wrapper, queryClient, mockGetUser } = createWrapper(listenerRef);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(listenerRef.current).toBeInstanceOf(Function);

    await act(async () => {
      listenerRef.current?.('SIGNED_OUT', null);
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    // getUser should only have been called once since cache is cleared instead of refetched
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    queryClient.clear();
  });

  it('refetches user data when Supabase emits USER_UPDATED', async () => {
    const { wrapper, queryClient, mockGetUser } = createWrapper(listenerRef);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      listenerRef.current?.('USER_UPDATED', null);
    });

    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(2));

    queryClient.clear();
  });

  it('forces a refetch when refreshUser is called', async () => {
    const { wrapper, queryClient, mockGetUser } = createWrapper(listenerRef);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refreshUser();
    });

    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(2));

    queryClient.clear();
  });
});
