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
