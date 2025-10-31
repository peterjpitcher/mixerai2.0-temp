import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolRunHistoryDetailPage from '@/app/dashboard/tools/history/[historyId]/page';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    apiFetchJson: jest.fn(),
  };
});

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

describe('ToolRunHistoryDetailPage', () => {
  const apiFetchJsonMock = apiFetchJson as unknown as jest.Mock;
  const useParamsMock = useParams as unknown as jest.Mock;
  const useRouterMock = useRouter as unknown as jest.Mock;
  const backMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue({ historyId: 'run-123' });
    useRouterMock.mockReturnValue({
      push: jest.fn(),
      back: backMock,
    });
  });

  const buildHistoryItem = () => ({
    id: 'run-123',
    user_id: 'user-1',
    tool_name: 'alt_text_generator',
    brand_id: null,
    inputs: {
      imageUrls: ['https://example.com/image.jpg'],
    },
    outputs: {
      results: [
        {
          imageUrl: 'https://example.com/image.jpg',
          altText: 'An example image',
        },
      ],
    },
    run_at: '2025-01-01T00:00:00.000Z',
    status: 'success' as const,
    error_message: null,
  });

  it('renders run details when the API returns an item', async () => {
    apiFetchJsonMock.mockResolvedValueOnce({
      success: true,
      historyItem: buildHistoryItem(),
    });

    render(<ToolRunHistoryDetailPage />);

    await screen.findByText(/Tool Run Details/i);

    expect(apiFetchJsonMock).toHaveBeenCalledWith(
      '/api/me/tool-run-history/run-123',
      { errorMessage: 'Failed to load history details.' }
    );
    expect(screen.getByText(/ALT TEXT GENERATOR - Run Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/SUCCESS/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Back to Previous Page/i }));
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('shows not found state when the API returns 404', async () => {
    const response = new Response(JSON.stringify({ error: 'History item not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
    const apiError = new ApiClientError('Not Found', {
      status: 404,
      statusText: 'Not Found',
      code: 'NOT_FOUND',
      details: null,
      body: { error: 'History item not found.' },
      response,
    });

    apiFetchJsonMock.mockRejectedValueOnce(apiError);

    render(<ToolRunHistoryDetailPage />);

    await screen.findByRole('heading', { name: /History Item Not Found/i });
    expect(screen.getByRole('button', { name: /Go Back to Log/i })).toBeInTheDocument();
  });

  it('renders generic error state for unexpected failures', async () => {
    apiFetchJsonMock.mockRejectedValueOnce(new Error('Unexpected'));

    render(<ToolRunHistoryDetailPage />);

    await waitFor(() =>
      expect(screen.getByText(/Error Loading History Item/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Unexpected/)).toBeInTheDocument();
  });
});
