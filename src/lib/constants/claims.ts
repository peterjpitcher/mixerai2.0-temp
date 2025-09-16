// Centralized constants for claims and overrides
// Use these across the app to avoid hard-coded literals.

export const GLOBAL_CLAIM_COUNTRY_CODE = '__GLOBAL__'; // for claims rows
export const ALL_COUNTRIES_CODE = '__ALL_COUNTRIES__'; // for market overrides & “apply to all markets” UX

// Helper display labels
export const COUNTRY_LABELS = {
  [GLOBAL_CLAIM_COUNTRY_CODE]: 'Global',
  [ALL_COUNTRIES_CODE]: 'All Countries',
} as const;

