import { COUNTRY_LANGUAGE_DATA } from './country-language-data';

const LANGUAGE_LABELS: Record<string, string> = {
  af: 'Afrikaans',
  ak: 'Akan',
  am: 'Amharic',
  ar: 'Arabic',
  bg: 'Bulgarian',
  bn: 'Bengali',
  ca: 'Catalan',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  eu: 'Basque',
  fi: 'Finnish',
  fil: 'Filipino',
  fr: 'French',
  ga: 'Irish (Gaelic)',
  gl: 'Galician',
  gn: 'Guaraní',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  id: 'Indonesian',
  ig: 'Igbo',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  km: 'Khmer',
  lo: 'Lao',
  mi: 'Māori',
  ms: 'Malay',
  mr: 'Marathi',
  my: 'Burmese',
  nb: 'Norwegian (Bokmål)',
  ne: 'Nepali',
  nl: 'Dutch',
  nn: 'Norwegian (Nynorsk)',
  pl: 'Polish',
  pt: 'Portuguese',
  qu: 'Quechua',
  ro: 'Romanian',
  ru: 'Russian',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese',
  xh: 'Xhosa',
  yo: 'Yoruba',
  zu: 'Zulu',
  'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)'
};

export const COUNTRIES = COUNTRY_LANGUAGE_DATA.map(country => ({
  value: country.code,
  label: country.name,
})).sort((a, b) => a.label.localeCompare(b.label));

const uniqueLanguageCodes = new Set(
  COUNTRY_LANGUAGE_DATA.flatMap(country => country.languages)
);

export const LANGUAGES = Array.from(uniqueLanguageCodes)
  .map(code => ({
    value: code,
    label: LANGUAGE_LABELS[code] ?? code.toUpperCase(),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function getLanguagesForCountry(countryCode?: string | null) {
  const entry = COUNTRY_LANGUAGE_DATA.find(
    country => country.code === (countryCode ?? '').toUpperCase()
  );
  if (!entry) return [];
  return entry.languages
    .map(code => ({
      value: code,
      label: LANGUAGE_LABELS[code] ?? code.toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getLanguageLabel(code?: string | null): string {
  if (!code) return 'Unknown';
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

export { COUNTRY_LANGUAGE_DATA };

// Vetting agencies types and data
export interface VettingAgency {
  id?: string;
  name: string;
  description: string;
  priority: number;
  website?: string;
}

export type VettingAgenciesByCountry = {
  [countryCode: string]: VettingAgency[];
};

// Vetting agencies organized by country code
export const VETTING_AGENCIES: VettingAgenciesByCountry = {
  // United States
  'US': [
    {
      name: 'FDA (Food and Drug Administration)',
      description: 'Regulates safety of food, drugs, cosmetics, and medical devices',
      priority: 1,
      website: 'https://www.fda.gov'
    },
    {
      name: 'FTC (Federal Trade Commission)',
      description: 'Enforces truth in advertising and prevents deceptive business practices',
      priority: 1,
      website: 'https://www.ftc.gov'
    },
    {
      name: 'NAD (National Advertising Division)',
      description: 'Self-regulatory body that monitors and reviews truth and accuracy in national advertising',
      priority: 2,
      website: 'https://bbbprograms.org/programs/all-programs/nad'
    },
    {
      name: 'USDA (United States Department of Agriculture)',
      description: 'Regulates organic claims, food safety, and agricultural products',
      priority: 2,
      website: 'https://www.usda.gov'
    },
    {
      name: 'EPA (Environmental Protection Agency)',
      description: 'Verifies environmental claims about products and sustainability practices',
      priority: 3,
      website: 'https://www.epa.gov'
    }
  ],
  
  // United Kingdom
  'GB': [
    {
      name: 'ASA (Advertising Standards Authority)',
      description: 'UK\'s independent regulator of advertising across all media',
      priority: 1,
      website: 'https://www.asa.org.uk'
    },
    {
      name: 'CMA (Competition and Markets Authority)',
      description: 'Enforces consumer protection legislation and promotes business competition',
      priority: 1,
      website: 'https://www.gov.uk/government/organisations/competition-and-markets-authority'
    },
    {
      name: 'Trading Standards',
      description: 'Local government bodies enforcing consumer protection laws',
      priority: 2,
      website: 'https://www.tradingstandards.uk'
    },
    {
      name: 'FSA (Food Standards Agency)',
      description: 'Protects public health related to food in England, Wales and Northern Ireland',
      priority: 2,
      website: 'https://www.food.gov.uk'
    },
    {
      name: 'MHRA (Medicines and Healthcare products Regulatory Agency)',
      description: 'Regulates medicines, medical devices and blood components for transfusion',
      priority: 3,
      website: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency'
    }
  ],
  
  // Default agencies for countries without specific entries
  'general': [
    {
      name: 'National Advertising Authority',
      description: 'The primary advertising regulatory body in your country',
      priority: 1
    },
    {
      name: 'Consumer Protection Agency',
      description: 'Government body responsible for protecting consumer rights',
      priority: 1
    },
    {
      name: 'Food and Drug Regulatory Authority',
      description: 'Regulates claims related to food, drugs, and health products',
      priority: 2
    },
    {
      name: 'Environmental Claims Authority',
      description: 'Verifies sustainability and environmental claims',
      priority: 3
    }
  ]
};

// Helper function to get vetting agencies for a specific country
export function getVettingAgenciesForCountry(countryCode?: string | null): VettingAgency[] {
  // If we have specific agencies for this country, return them
  if (countryCode && VETTING_AGENCIES[countryCode]) {
    return VETTING_AGENCIES[countryCode].sort((a, b) => a.priority - b.priority);
  }
  
  // Otherwise, return the general agencies
  return VETTING_AGENCIES['general'].sort((a, b) => a.priority - b.priority);
} 
