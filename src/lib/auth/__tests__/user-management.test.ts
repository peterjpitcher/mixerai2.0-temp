import { createClient } from '@supabase/supabase-js';
import { inviteNewUserWithAppMetadata } from '../user-management';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        inviteUserByEmail: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        }),
        updateUserById: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  })),
}));

const supabaseAdmin = createClient('https://test.supabase.co', 'test-key');

describe('inviteNewUserWithAppMetadata', () => {
  it('should invite a new user and update app metadata successfully', async () => {
    const email = 'test@example.com';
    const appMetadata = { role: 'viewer' };
    const userMetadata = { full_name: 'Test User' };

    const { user, error } = await inviteNewUserWithAppMetadata(email, appMetadata, supabaseAdmin, userMetadata);

    expect(user).toEqual({ id: 'test-user-id', email: 'test@example.com' });
    expect(error).toBeNull();
  });

  it('should handle metadata update failure and delete the user', async () => {
    const email = 'fail@example.com';
    const appMetadata = { role: 'viewer' };
    const userMetadata = { full_name: 'Fail User' };

    // Mock updateUserById to fail
    supabaseAdmin.auth.admin.updateUserById = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Update failed'),
    });

    const { user, error } = await inviteNewUserWithAppMetadata(email, appMetadata, supabaseAdmin, userMetadata);

    expect(user).toBeNull();
    expect(error).toEqual(new Error('Metadata update failed. User was deleted to maintain security.'));
  });
}); 