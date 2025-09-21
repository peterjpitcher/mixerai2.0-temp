import type { User } from '@supabase/supabase-js';

type MaybeUser = Pick<User, 'app_metadata' | 'user_metadata'> | null | undefined;

type GlobalRole = 'admin' | 'editor' | 'viewer';

function normalizeRole(role: unknown): GlobalRole | null {
  if (typeof role !== 'string') return null;
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'editor' || normalized === 'viewer') {
    return normalized;
  }
  return null;
}

export function getGlobalRole(
  user: MaybeUser,
  { fallbackToUserMetadata = false }: { fallbackToUserMetadata?: boolean } = {}
): GlobalRole | null {
  const fromApp = normalizeRole(user?.app_metadata?.global_role ?? user?.app_metadata?.role);
  if (fromApp) {
    return fromApp;
  }

  if (fallbackToUserMetadata) {
    return normalizeRole(user?.user_metadata?.role);
  }

  return null;
}

export function isGlobalAdmin(user: MaybeUser): boolean {
  return getGlobalRole(user) === 'admin';
}

export function isGlobalAdminWithFallback(user: MaybeUser): boolean {
  return getGlobalRole(user, { fallbackToUserMetadata: true }) === 'admin';
}

export function ensureGlobalRole(user: MaybeUser, desiredRole: GlobalRole): boolean {
  return getGlobalRole(user) === desiredRole;
}

export function applyDerivedGlobalRole<T extends MaybeUser>(user: T): T {
  if (!user) return user;
  const derivedRole = getGlobalRole(user);
  const sanitizedRole = derivedRole ?? 'viewer';
  user.app_metadata = { ...(user.app_metadata ?? {}), global_role: sanitizedRole };
  user.user_metadata = { ...(user.user_metadata ?? {}), role: sanitizedRole };
  return user;
}
