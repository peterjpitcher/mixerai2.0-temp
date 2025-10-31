import { render, screen } from '@testing-library/react';
import { TeamActivityFeed, ActivityType } from '../team-activity-feed';

const buildActivity = (
  overrides: Partial<Parameters<typeof TeamActivityFeed>[0]['initialActivity'][number]> & {
    type?: ActivityType;
  }
) => ({
  id: 'activity-id',
  type: 'content_created' as ActivityType,
  created_at: '2024-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    full_name: 'Test User',
    avatar_url: null,
  },
  target: {
    id: 'content-1',
    name: 'Sample Content',
    type: 'content' as const,
  },
  ...overrides,
});

describe('TeamActivityFeed', () => {
  it('creates correct dashboard links for each target type', () => {
    const activities = [
      buildActivity({
        id: 'content-activity',
        target: {
          id: 'content-123',
          name: 'Content Item',
          type: 'content',
        },
      }),
      buildActivity({
        id: 'brand-activity',
        target: {
          id: 'brand-42',
          name: 'Acme Brand',
          type: 'brand',
        },
        type: 'brand_created',
      }),
      buildActivity({
        id: 'user-activity',
        target: {
          id: 'user-55',
          name: 'Invited User',
          type: 'user',
        },
        type: 'user_invited',
      }),
    ];

    render(<TeamActivityFeed initialActivity={activities} />);

    expect(screen.getByRole('link', { name: 'Content Item' })).toHaveAttribute('href', '/dashboard/content/content-123');
    expect(screen.getByRole('link', { name: 'Acme Brand' })).toHaveAttribute('href', '/dashboard/brands/brand-42');
    expect(screen.getByRole('link', { name: 'Invited User' })).toHaveAttribute('href', '/dashboard/users/user-55');
  });
});
