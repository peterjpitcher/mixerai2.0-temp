// Centralized constants for claims and overrides
// Use these across the app to avoid hard-coded literals.

export const GLOBAL_CLAIM_COUNTRY_CODE = '__GLOBAL__'; // for claims rows
export const ALL_COUNTRIES_CODE = '__ALL_COUNTRIES__'; // for market overrides & “apply to all markets” UX

// Helper display labels
export const COUNTRY_LABELS = {
  [GLOBAL_CLAIM_COUNTRY_CODE]: 'Global',
  [ALL_COUNTRIES_CODE]: 'All Countries',
} as const;

export const PRODUCT_CLAIMS_DEPRECATION_MESSAGE =
  'Product Claims have been deprecated. Existing records remain available for reference, but new claims can no longer be created.';

export const PRODUCT_CLAIMS_STATUS_MESSAGE =
  'Testing of our product claims functionality has been a success, and we\'re working with International Leadership to align the priority of creating a dedicated product information management platform so that the data collected can be used for multiple purposes.';
