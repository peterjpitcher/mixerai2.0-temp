import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPageClient from '@/app/dashboard/content/content-page-client';
import { apiFetch as apiFetchMock } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-common-data';
import { toast as sonnerToast } from 'sonner';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null
  })
}));

jest.mock('@/hooks/use-common-data', () => ({
  useCurrentUser: jest.fn()
}));

jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}));

jest.mock('@/components/ui/loading-skeletons', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">loading</div>
}));

jest.mock('@/components/content/create-content-dropdown', () => ({
  CreateContentDropdown: () => <div data-testid="create-content-dropdown" />
}));

describe('ContentPageClient pagination & permissions', () => {
  const apiFetch = apiFetchMock as unknown as jest.Mock;
  const useCurrentUserMock = useCurrentUser as unknown as jest.Mock;
  const toastMock = sonnerToast as unknown as { error: jest.Mock; success: jest.Mock };

  const defaultUser = {
    id: 'current-user',
    user_metadata: { role: 'editor' },
    brand_permissions: [{ brand_id: 'brand-123', role: 'admin' }]
  };

  const createApiResponse = (items: Array<{ id: string; title: string }>, page: number, total: number) => ({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: items.map((item, index) => ({
          id: item.id,
          title: item.title,
          brand_id: 'brand-123',
          brand_name: 'Brand A',
          status: 'draft',
          updated_at: `2025-10-3${index}T00:00:00Z`,
          created_at: `2025-10-2${index}T00:00:00Z`,
          assigned_to: [],
          assigned_to_name: null,
          created_by_name: 'Author',
          due_date: null
        })),
        pagination: {
          page,
          limit: 2,
          total,
          totalPages: Math.ceil(total / 2),
          hasNextPage: page < Math.ceil(total / 2),
          hasPreviousPage: page > 1
        }
      })
  });

  beforeEach(() => {
    useCurrentUserMock.mockReturnValue({
      data: defaultUser,
      isLoading: false
    });
    apiFetch.mockReset();
    toastMock.error.mockReset();
    toastMock.success.mockReset();
  });

  it('navigates through pages using pagination controls', async () => {
    const page1Items = [
      { id: 'item-1', title: 'First content' },
      { id: 'item-2', title: 'Second content' }
    ];
    const page2Items = [
      { id: 'item-3', title: 'Third content' },
      { id: 'item-4', title: 'Fourth content' }
    ];

    apiFetch
      .mockResolvedValueOnce(createApiResponse(page1Items, 1, 4))
      .mockResolvedValueOnce(createApiResponse(page2Items, 2, 4));

    await act(async () => {
      render(<ContentPageClient />);
    });

    expect(await screen.findByText('First content')).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(nextButton);

    await waitFor(() => expect(screen.getByText('Third content')).toBeInTheDocument());
    expect(screen.queryByText('First content')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

  it('shows inline skeleton rows while refreshing between pages', async () => {
    const page1Items = [
      { id: 'item-1', title: 'First content' },
      { id: 'item-2', title: 'Second content' }
    ];
    const page2Items = [{ id: 'item-3', title: 'Third content' }];

    let resolveSecondFetch: (() => void) | undefined;

    apiFetch
      .mockResolvedValueOnce(createApiResponse(page1Items, 1, 3))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecondFetch = () => resolve(createApiResponse(page2Items, 2, 3));
          })
      );

    await act(async () => {
      render(<ContentPageClient />);
    });

    expect(await screen.findByText('First content')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('First content')).not.toBeInTheDocument();

    await act(async () => {
      resolveSecondFetch?.();
    });

    await waitFor(() => expect(screen.getByText('Third content')).toBeInTheDocument());
  });

  it('renders permission state without triggering duplicate error toast on 403', async () => {
    useCurrentUserMock.mockReturnValue({
      data: {
        ...defaultUser,
        brand_permissions: [{ brand_id: 'brand-123', role: 'editor' }]
      },
      isLoading: false
    });

    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Forbidden'
        })
    });

    await act(async () => {
      render(<ContentPageClient />);
    });

    expect(await screen.findByText(/you do not have access/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all content/i })).toBeInTheDocument();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('shows inline edit button but no action dropdown when user lacks delete permission', async () => {
    useCurrentUserMock.mockReturnValue({
      data: {
        ...defaultUser,
        brand_permissions: [{ brand_id: 'brand-123', role: 'editor' }]
      },
      isLoading: false
    });

    apiFetch.mockResolvedValueOnce(
      createApiResponse(
        [
          {
            id: 'item-1',
            title: 'Only editable content'
          }
        ],
        1,
        1
      )
    );

    await act(async () => {
      render(<ContentPageClient />);
    });

    expect(await screen.findByText('Only editable content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open menu/i })).not.toBeInTheDocument();
  });
});
