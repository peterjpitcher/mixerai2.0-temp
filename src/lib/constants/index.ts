// Country data
export const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'BR', label: 'Brazil' },
  { value: 'IN', label: 'India' },
  { value: 'MX', label: 'Mexico' },
  { value: 'RU', label: 'Russia' },
  { value: 'ZA', label: 'South Africa' },
].sort((a, b) => a.label.localeCompare(b.label));

// Language data
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ko', label: 'Korean' },
  { value: 'pl', label: 'Polish' },
].sort((a, b) => a.label.localeCompare(b.label));

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