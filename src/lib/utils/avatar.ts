export function getAvatarUrl(id?: string | null, avatarUrl?: string | null) {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl;
  }

  if (!id) {
    return undefined;
  }

  const seed = encodeURIComponent(id);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

export function getNameInitials(name?: string | null) {
  if (!name) return '';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];

  return `${firstInitial}${lastInitial}`.toUpperCase();
}
