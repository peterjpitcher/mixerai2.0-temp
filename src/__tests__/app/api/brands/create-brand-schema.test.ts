import { createBrandSchema } from '@/app/api/brands/create-brand-schema';

describe('createBrandSchema URL validation', () => {
  it('trims and accepts valid http(s) URLs', () => {
    const result = createBrandSchema.safeParse({
      name: 'Example Brand',
      website_url: ' https://example.com ',
      additional_website_urls: [' https://valid.example.com/path '],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website_url).toBe('https://example.com');
      expect(result.data.additional_website_urls).toEqual(['https://valid.example.com/path']);
    }
  });

  it('filters out whitespace-only additional URLs', () => {
    const result = createBrandSchema.safeParse({
      name: 'Example Brand',
      additional_website_urls: ['   '],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additional_website_urls).toEqual([]);
    }
  });

  it('rejects additional URLs with disallowed protocols', () => {
    const result = createBrandSchema.safeParse({
      name: 'Example Brand',
      additional_website_urls: ['javascript:alert(1)'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects main website URLs with disallowed protocols', () => {
    const result = createBrandSchema.safeParse({
      name: 'Example Brand',
      website_url: 'ftp://example.com',
    });

    expect(result.success).toBe(false);
  });
});
