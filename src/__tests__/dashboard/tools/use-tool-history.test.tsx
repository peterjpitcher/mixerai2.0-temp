import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useToolHistory, type ToolRunHistoryRecord } from '@/app/dashboard/tools/use-tool-history';
import { apiFetchJson } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    apiFetchJson: jest.fn(),
  };
});

describe('useToolHistory', () => {
  const apiFetchJsonMock = apiFetchJson as unknown as jest.Mock;

  const createHistoryRecord = (
    overrides: Partial<ToolRunHistoryRecord> = {}
  ): ToolRunHistoryRecord => ({
    id: 'run-1',
    user_id: 'user-1',
    tool_name: 'alt_text_generator',
    brand_id: null,
    inputs: {},
    outputs: {},
    run_at: '2025-01-01T00:00:00.000Z',
    status: 'success',
    error_message: null,
    batch_id: null,
    batch_sequence: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads initial history for the given tool', async () => {
    const history = [createHistoryRecord()];
    apiFetchJsonMock.mockResolvedValueOnce({
      success: true,
      history,
      pagination: { page: 1, limit: 10, total: 1 },
    });

    const { result } = renderHook(() =>
      useToolHistory('alt_text_generator', { pageSize: 10 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(apiFetchJsonMock).toHaveBeenCalledTimes(1);
    expect(apiFetchJsonMock.mock.calls[0][0]).toContain('tool_name=alt_text_generator');
    expect(result.current.items).toEqual(history);
    expect(result.current.hasMore).toBe(false);
  });

  it('applies status filter when provided', async () => {
    apiFetchJsonMock.mockResolvedValue({
      success: true,
      history: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });

    renderHook(() =>
      useToolHistory('metadata_generator', {
        filters: { status: 'failure' },
      })
    );

    await waitFor(() => expect(apiFetchJsonMock).toHaveBeenCalled());
    expect(apiFetchJsonMock.mock.calls[0][0]).toContain('status=failure');
  });

  it('appends additional pages when loadMore is called', async () => {
    const firstPage = [createHistoryRecord({ id: 'run-1' })];
    const secondPage = [createHistoryRecord({ id: 'run-2' })];

    apiFetchJsonMock
      .mockResolvedValueOnce({
        success: true,
        history: firstPage,
        pagination: { page: 1, limit: 1, total: 2 },
      })
      .mockResolvedValueOnce({
        success: true,
        history: secondPage,
        pagination: { page: 2, limit: 1, total: 2 },
      });

    const { result } = renderHook(() =>
      useToolHistory('alt_text_generator', { pageSize: 1 })
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map(item => item.id)).toEqual(['run-1', 'run-2']);
  });

  it('captures errors from apiFetchJson', async () => {
    apiFetchJsonMock.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useToolHistory('alt_text_generator'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe('Network failure');
    expect(result.current.hasMore).toBe(false);
  });
});
