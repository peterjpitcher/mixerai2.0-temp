export interface Country {
  code: string;
  name: string;
}

export const COUNTRY_CODES: Country[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" },
  // Add more countries as needed. 
  // Consider a more comprehensive list or a library if many countries are required.
  // For now, keeping it concise.
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "NZ", name: "New Zealand" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "KR", name: "South Korea" },
  { code: "RU", name: "Russia" }, 
];

export const ALL_COUNTRY_CODES_OBJECT: Record<string, string> = 
  COUNTRY_CODES.reduce((obj, country) => {
    obj[country.code] = country.name;
    return obj;
  }, {} as Record<string, string>);

// Option for a global/non-specific country choice
export const GLOBAL_COUNTRY_CODE = "__GLOBAL__";
export const GLOBAL_COUNTRY_NAME = "Global (All Countries)"; 