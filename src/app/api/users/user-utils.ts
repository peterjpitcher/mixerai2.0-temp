import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email?: string | null;
  avatar_url: string | null;
  job_title?: string | null;
  company?: string | null;
}

export interface BrandPermissionRecord {
  user_id: string;
  brand_id: string;
  role: string;
}

export interface BrandRecord {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
}

export interface InvitationStatusRecord {
  id: string;
  invitation_status?: string | null;
  expires_at?: string | null;
  user_status?: string | null;
}

export interface MergedUserRecord {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string;
  job_title: string;
  company: string;
  role: string;
  global_role: string | null;
  highest_brand_role: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  brand_permissions: Array<{
    brand_id: string;
    role: string;
    brand?: {
      id: string;
      name: string;
      brand_color?: string | null;
      logo_url?: string | null;
    };
  }>;
  invitation_status: string | null;
  invitation_expires_at: string | null;
  user_status: string;
  is_current_user: boolean;
}

export function titleCaseRole(role: string | null | undefined): string {
  if (!role) return 'Viewer';
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'Admin';
  if (lower === 'editor') return 'Editor';
  return 'Viewer';
}

function getHighestBrandRole(permissions: Array<{ role: string }> | undefined): string | null {
  if (!permissions || permissions.length === 0) return null;
  let highest: string | null = null;
  for (const permission of permissions) {
    const role = permission.role?.toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'editor' && highest !== 'admin') {
      highest = 'editor';
    } else if (!highest) {
      highest = 'viewer';
    }
  }
  return highest ?? null;
}

export function buildUserResponse(
  authUser: SupabaseAuthUser,
  profile: ProfileRecord | undefined,
  brandPermissions: Array<{ brand_id: string; role: string }> | undefined,
  brandsMap: Map<string, BrandRecord>,
  invitationStatus: InvitationStatusRecord | undefined,
  currentUserId: string
): MergedUserRecord {
  const brandPermissionsDetailed = (brandPermissions || []).map(permission => {
    const brand = brandsMap.get(permission.brand_id);
    return {
      ...permission,
      brand: brand
        ? {
            id: brand.id,
            name: brand.name,
            brand_color: brand.brand_color ?? undefined,
            logo_url: brand.logo_url ?? undefined,
          }
        : undefined,
    };
  });

  const highestBrandRole = getHighestBrandRole(brandPermissions);
  const globalRole =
    typeof authUser.user_metadata?.role === 'string'
      ? String(authUser.user_metadata.role).toLowerCase()
      : null;
  const displayRole = globalRole ?? highestBrandRole ?? 'viewer';
  const userStatus =
    (authUser.user_metadata?.status as string | undefined) ||
    (invitationStatus?.user_status as string | undefined) ||
    'active';

  return {
    id: authUser.id,
    full_name:
      profile?.full_name ||
      (authUser.user_metadata?.full_name as string | undefined) ||
      'Unnamed User',
    email: profile?.email || authUser.email || null,
    avatar_url:
      profile?.avatar_url ||
      (authUser.user_metadata?.avatar_url as string | undefined) ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
    job_title:
      profile?.job_title || (authUser.user_metadata?.job_title as string | undefined) || '',
    company: profile?.company || (authUser.user_metadata?.company as string | undefined) || '',
    role: titleCaseRole(displayRole),
    global_role: globalRole ? titleCaseRole(globalRole) : null,
    highest_brand_role: highestBrandRole ? titleCaseRole(highestBrandRole) : null,
    created_at: authUser.created_at ?? null,
    last_sign_in_at: authUser.last_sign_in_at ?? null,
    brand_permissions: brandPermissionsDetailed,
    invitation_status: invitationStatus?.invitation_status ?? null,
    invitation_expires_at: invitationStatus?.expires_at ?? null,
    user_status: userStatus,
    is_current_user: authUser.id === currentUserId,
  };
}
