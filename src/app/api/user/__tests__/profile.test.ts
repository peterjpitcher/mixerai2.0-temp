import { hasProfileUpdates, updateProfileSchema } from '../profile/validation';

describe('profile update validation', () => {
  it('identifies when no profile fields are provided', () => {
    const parsed = updateProfileSchema.parse({});
    expect(hasProfileUpdates(parsed)).toBe(false);
  });

  it('identifies when at least one profile field is provided', () => {
    const parsed = updateProfileSchema.parse({ fullName: 'New Name' });
    expect(hasProfileUpdates(parsed)).toBe(true);
  });

  it('rejects invalid avatar URLs', () => {
    const result = updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});
