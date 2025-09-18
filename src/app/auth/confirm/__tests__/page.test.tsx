import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { ConfirmLogic } from '../confirm-logic';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(),
}));

const mockReplace = jest.fn();
const mockUseRouter = jest.requireMock('next/navigation').useRouter as jest.Mock;
const mockUseSearchParams = jest.requireMock('next/navigation').useSearchParams as jest.Mock;
const mockCreateSupabaseClient = jest.requireMock('@/lib/supabase/client').createSupabaseClient as jest.Mock;

describe('Auth Invite Confirmation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
  });

  it('redirects to password update when the invite code exchanges successfully', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({ data: null, error: null });
    mockCreateSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession,
      },
    } as unknown as SupabaseClient);

    mockUseSearchParams.mockReturnValue(new URLSearchParams('code=valid-token'));

    render(<ConfirmLogic />);

    await waitFor(() => {
      expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-token');
      expect(mockReplace).toHaveBeenCalledWith('/auth/update-password');
    });
  });

  it('shows an actionable error when the invite code is expired', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid grant: code has expired',
        status: 400,
        name: 'AuthApiError',
      },
    });

    mockCreateSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession,
      },
    } as unknown as SupabaseClient);

    mockUseSearchParams.mockReturnValue(new URLSearchParams('code=expired-token'));

    render(<ConfirmLogic />);

    expect(await screen.findByText("We couldn't confirm your invite")).toBeInTheDocument();
    expect(
      screen.getByText('This invitation link has expired or was already used. Ask your administrator to send a new invite.')
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows an error when the link is missing a code', async () => {
    mockCreateSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn(),
      },
    } as unknown as SupabaseClient);

    mockUseSearchParams.mockReturnValue(new URLSearchParams(''));

    render(<ConfirmLogic />);

    expect(await screen.findByText("We couldn't confirm your invite")).toBeInTheDocument();
    expect(
      screen.getByText('This confirmation link is missing the security code. Ask your administrator to send a new invite.')
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
