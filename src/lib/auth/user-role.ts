import type { User } from '@supabase/supabase-js';

type MaybeUser = Pick<User, 'app_metadata' | 'user_metadata'> | null | undefined;

type GlobalRole = 'admin' | 'editor' | 'viewer';

const ROLE_SYNONYMS: Record<string, GlobalRole> = {
  admin: 'admin',
  'platform_admin': 'admin',
  'platform-admin': 'admin',
  'global_admin': 'admin',
  'global-admin': 'admin',
  'super_admin': 'admin',
  'super-admin': 'admin',
  'superadmin': 'admin',
  'org_admin': 'admin',
  'org-admin': 'admin',
  'brand_admin': 'editor',
  'brand-admin': 'editor',
  editor: 'editor',
  'content_editor': 'editor',
  'content-editor': 'editor',
  'content_admin': 'editor',
  'content-admin': 'editor',
  'power_user': 'editor',
  'power-user': 'editor',
  manager: 'editor',
  'brand_manager': 'editor',
  'brand-manager': 'editor',
  reviewer: 'editor',
  writer: 'editor',
  viewer: 'viewer',
  'read_only': 'viewer',
  'read-only': 'viewer',
  'read_only_user': 'viewer',
  'read-only-user': 'viewer',
  'brand_viewer': 'viewer',
  'brand-viewer': 'viewer',
  analyst: 'viewer',
};

function normalizeRole(role: unknown): GlobalRole | null {
  if (!role) return null;

  if (Array.isArray(role)) {
    for (const candidate of role) {
      const normalized = normalizeRole(candidate);
      if (normalized) return normalized;
    }
    return null;
  }

  if (typeof role !== 'string') return null;

  const sanitized = role.trim().toLowerCase();
  if (!sanitized) return null;

  if (ROLE_SYNONYMS[sanitized]) {
    return ROLE_SYNONYMS[sanitized];
  }

  return null;
}

function extractRoleFromMetadata(meta: unknown): GlobalRole | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const record = meta as Record<string, unknown>;

  const primaryKeys = ['global_role', 'globalRole', 'role', 'intended_role', 'intendedRole'];
  for (const key of primaryKeys) {
    const normalized = normalizeRole(record[key]);
    if (normalized) {
      return normalized;
    }
  }

  const arrayKeys = ['roles', 'global_roles', 'globalRoles'];
  for (const key of arrayKeys) {
    const normalized = normalizeRole(record[key]);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getGlobalRole(
  user: MaybeUser,
  { fallbackToUserMetadata = false }: { fallbackToUserMetadata?: boolean } = {}
): GlobalRole | null {
  const fromApp = extractRoleFromMetadata(user?.app_metadata);
  if (fromApp) {
    return fromApp;
  }

  if (fallbackToUserMetadata) {
    return extractRoleFromMetadata(user?.user_metadata) ?? normalizeRole(user?.user_metadata);
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
