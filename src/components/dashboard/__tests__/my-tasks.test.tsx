import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyTasks } from '../my-tasks';
import { apiFetchJson } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    apiFetchJson: jest.fn(),
  };
});

const mockedApiFetchJson = apiFetchJson as jest.MockedFunction<typeof apiFetchJson>;

describe('MyTasks', () => {
  beforeEach(() => {
    mockedApiFetchJson.mockReset();
  });

  it('renders tasks returned by the API', async () => {
    mockedApiFetchJson.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'task-1',
          content_id: 'content-1',
          content_title: 'Content Review',
          workflow_step_name: 'Review',
          created_at: new Date().toISOString(),
          brand_name: 'Acme',
          brand_color: '#000000',
          brand_logo_url: null,
        },
      ],
    } as any);

    render(<MyTasks />);

    await waitFor(() => {
      expect(mockedApiFetchJson).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('link', { name: 'Content Review' })).toBeInTheDocument();
    expect(screen.queryByText('Unable to load tasks right now.')).not.toBeInTheDocument();
  });

  it('shows an error message and retry button when the request fails', async () => {
    mockedApiFetchJson.mockRejectedValueOnce(new Error('Network down'));

    render(<MyTasks />);

    expect(await screen.findByText('Unable to load tasks right now.')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();

    mockedApiFetchJson.mockResolvedValueOnce({ success: true, data: [] } as any);
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(mockedApiFetchJson).toHaveBeenCalledTimes(2);
    });
  });
});
