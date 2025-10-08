const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
};

const COUNTRY_MAP: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
};

export function describeLanguage(code?: string | null): string | null {
  if (!code) return null;
  const normalised = code.trim().toLowerCase().replace('_', '-');
  const parts = normalised.split('-');
  const base = parts[0];
  return LANGUAGE_MAP[normalised] || LANGUAGE_MAP[base] || code;
}

export function describeCountry(code?: string | null): string | null {
  if (!code) return null;
  const normalised = code.trim().toUpperCase().replace('-', '_');
  return COUNTRY_MAP[normalised] || code;
}

export function createLocaleDirectives(languageCode?: string | null, countryCode?: string | null) {
  const languageName = describeLanguage(languageCode);
  const countryName = describeCountry(countryCode);

  const userInstructions: string[] = [];
  const systemDirectives: string[] = [];

  if (languageName) {
    userInstructions.push(`All output MUST be written in ${languageName}. Rewrite any supplied content into ${languageName}.`);
    systemDirectives.push(`Respond exclusively in ${languageName}.`);
  }

  if (countryName) {
    userInstructions.push(`Ensure tone, spelling, and examples match readers in ${countryName}.`);
    systemDirectives.push(`Ensure the writing suits readers in ${countryName}.`);
  }

  return {
    languageName,
    countryName,
    userInstructions,
    systemDirectives,
  };
}
