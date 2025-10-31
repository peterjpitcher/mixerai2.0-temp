import { renderHook, act } from '@testing-library/react';
import { useToolAccess } from '@/app/dashboard/tools/use-tool-access';
import { useCurrentUser } from '@/hooks/use-common-data';
import { ApiClientError } from '@/lib/api-client';

jest.mock('@/hooks/use-common-data', () => ({
  useCurrentUser: jest.fn(),
}));

describe('useToolAccess', () => {
  const useCurrentUserMock = useCurrentUser as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseQueryResult = {
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  };

  it('grants access for users with allowed roles', () => {
    useCurrentUserMock.mockReturnValue({
      ...baseQueryResult,
      data: {
        id: 'user-1',
        user_metadata: { role: 'editor' },
      },
      error: null,
    });

    const { result } = renderHook(() => useToolAccess());

    expect(result.current.hasAccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBeNull();
  });

  it('denies access when user lacks required role', () => {
    useCurrentUserMock.mockReturnValue({
      ...baseQueryResult,
      data: {
        id: 'user-2',
        user_metadata: { role: 'viewer' },
      },
      error: null,
    });

    const { result } = renderHook(() => useToolAccess());

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('normalizes ApiClientError details and exposes refetch', () => {
    const underlyingRefetch = jest.fn();
    const apiErrorResponse = new Response(
      JSON.stringify({ error: 'Forbidden access' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const apiError = new ApiClientError('Forbidden', {
      status: 403,
      statusText: 'Forbidden',
      code: 'AUTH_REQUIRED',
      details: null,
      body: { error: 'Forbidden access' },
      response: apiErrorResponse,
    });

    useCurrentUserMock.mockReturnValue({
      ...baseQueryResult,
      data: null,
      error: apiError,
      refetch: underlyingRefetch,
    });

    const { result } = renderHook(() => useToolAccess(['admin']));

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBe('Forbidden');
    expect(result.current.status).toBe(403);

    act(() => {
      result.current.refetch();
    });

    expect(underlyingRefetch).toHaveBeenCalledTimes(1);
  });
});
