import { ALL_COUNTRIES_CODE as ALL_COUNTRIES_CODE_BASE } from '@/lib/constants/claims';

export interface Country {
  code: string;
  name: string;
}

// Backward-compat re-exports. Prefer importing from '@/lib/constants/claims'.
export const ALL_COUNTRIES_CODE = ALL_COUNTRIES_CODE_BASE;
export const ALL_COUNTRIES_NAME = "All Countries";
