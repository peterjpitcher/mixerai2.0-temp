const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const hasScheme = (value: string): boolean => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

/**
 * Normalize a user-supplied URL candidate.
 * - Trims whitespace
 * - Adds https:// when no scheme is present
 * - Rejects non-http(s) protocols
 * - Lowercases hostname
 * - Removes hash fragments
 * - Normalizes root paths to omit trailing slash
 */
export function normalizeUrlCandidate(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = hasScheme(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!HTTP_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    url.hostname = url.hostname.toLowerCase();
    url.hash = '';

    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '/');
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;

    return `${url.protocol}//${url.host}${normalizedPath}${url.search}`;
  } catch {
    return null;
  }
}

export interface AdditionalUrlEntry {
  id: string;
  value: string;
}

export interface AdditionalUrlSanitizationResult {
  normalized: string[];
  invalid: string[];
}

/**
 * Convert additional website entries into a deduplicated, validated list of URLs.
 */
export function sanitizeAdditionalWebsiteEntries(
  entries: AdditionalUrlEntry[]
): AdditionalUrlSanitizationResult {
  const normalizedSet = new Set<string>();
  const invalid: string[] = [];

  entries.forEach((entry) => {
    const raw = typeof entry?.value === 'string' ? entry.value.trim() : '';
    if (!raw) {
      return;
    }

    const normalized = normalizeUrlCandidate(raw);
    if (!normalized) {
      invalid.push(raw);
      return;
    }

    normalizedSet.add(normalized);
  });

  return {
    normalized: Array.from(normalizedSet),
    invalid,
  };
}

/**
 * Basic hex colour validation helper.
 */
export function isValidHexColor(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return /^#[0-9A-F]{6}$/i.test(value.trim());
}

/**
 * Prefer a candidate colour when it is a valid 6-digit hex, otherwise fall back.
 */
export function resolveBrandColor(candidate: string | null | undefined, fallback: string): string {
  return isValidHexColor(candidate) ? (candidate as string).trim() : fallback;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return UUID_REGEX.test(trimmed);
}

/**
 * Narrow abort errors so consumers can safely silence them.
 */
export function isAbortError(error: unknown): error is DOMException {
  if (!error) return false;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return (
    typeof error === 'object' &&
    'name' in (error as Record<string, unknown>) &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}
