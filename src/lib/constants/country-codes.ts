export interface Country {
  code: string;
  name: string;
}

// COUNTRY_CODES and ALL_COUNTRY_CODES_OBJECT are now obsolete as countries are fetched from the database.
// Keeping the Country interface in case it's used for type definitions elsewhere,
// but it can be removed if all country data is typed directly from API responses.

// Option for a global/non-specific country choice
export const ALL_COUNTRIES_CODE = "__ALL_COUNTRIES__";
export const ALL_COUNTRIES_NAME = "All Countries"; 