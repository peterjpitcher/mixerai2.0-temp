import {
  normalizeUrlCandidate,
  sanitizeAdditionalWebsiteEntries,
  isValidHexColor,
  resolveBrandColor,
  isValidUuid,
} from '@/app/dashboard/brands/new/utils';

describe('normalizeUrlCandidate', () => {
  it('adds https scheme when missing and trims whitespace', () => {
    expect(normalizeUrlCandidate(' example.com ')).toBe('https://example.com');
  });

  it('normalizes host casing and strips hash fragments', () => {
    expect(normalizeUrlCandidate('https://Example.com/path/#section')).toBe('https://example.com/path');
  });

  it('rejects non-http protocols', () => {
    expect(normalizeUrlCandidate('javascript:alert(1)')).toBeNull();
  });
});

describe('sanitizeAdditionalWebsiteEntries', () => {
  it('deduplicates entries, normalizes valid URLs, and reports invalid ones', () => {
    const result = sanitizeAdditionalWebsiteEntries([
      { id: '1', value: ' https://Example.com ' },
      { id: '2', value: 'example.com/path' },
      { id: '3', value: 'ftp://bad.example.com' },
      { id: '4', value: 'javascript:alert(1)' },
      { id: '5', value: ' ' },
    ]);

    expect(result.normalized).toEqual(['https://example.com', 'https://example.com/path']);
    expect(result.invalid).toEqual(['ftp://bad.example.com', 'javascript:alert(1)']);
  });
});

describe('colour helpers', () => {
  it('validates strict 6-digit hex values', () => {
    expect(isValidHexColor('#A1B2C3')).toBe(true);
    expect(isValidHexColor('deep blue')).toBe(false);
  });

  it('prefers valid candidates and otherwise falls back', () => {
    expect(resolveBrandColor('deep blue', '#123456')).toBe('#123456');
    expect(resolveBrandColor(' #A1B2C3 ', '#123456')).toBe('#A1B2C3');
  });
});

describe('isValidUuid', () => {
  it('accepts canonical UUIDs', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});
