import {
  generateSlug,
  isValidSlug,
  ensureUniqueSlug,
  generateSlugFromTitle,
} from '../slug';

describe('Slug Generation Utilities', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('This Is A Test')).toBe('this-is-a-test');
    });

    it('should handle special characters', () => {
      expect(generateSlug('Hello & World!')).toBe('hello-and-world');
      expect(generateSlug('50% Off Sale')).toBe('50-percent-off-sale');
      expect(generateSlug('C++ Programming')).toBe('c-plus-plus-programming');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(generateSlug('Hello@#$%World')).toBe('hello-world');
      expect(generateSlug('Test!!!123')).toBe('test-123');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(generateSlug('Hello   World')).toBe('hello-world');
      expect(generateSlug('Test - - - Case')).toBe('test-case');
    });

    it('should trim leading and trailing dashes', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
      expect(generateSlug('---Test---')).toBe('test');
    });

    it('should handle unicode when allowed', () => {
      expect(generateSlug('Café München', { allowUnicode: true })).toBe('café-münchen');
      expect(generateSlug('Café München', { allowUnicode: false })).toBe('cafe-munchen');
    });

    it('should respect custom separator', () => {
      expect(generateSlug('Hello World', { separator: '_' })).toBe('hello_world');
      expect(generateSlug('Test Case', { separator: '.' })).toBe('test.case');
    });

    it('should enforce maximum length', () => {
      const longText = 'This is a very long title that should be truncated';
      expect(generateSlug(longText, { maxLength: 20 })).toBe('this-is-a-very-long');
      expect(generateSlug(longText, { maxLength: 10 })).toBe('this-is-a');
    });

    it('should not break words when truncating', () => {
      expect(generateSlug('Hello World Example', { maxLength: 13 })).toBe('hello-world');
      expect(generateSlug('Testing Truncation', { maxLength: 8 })).toBe('testing');
    });

    it('should handle empty strings', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug('   ')).toBe('');
    });

    it('should handle numbers', () => {
      expect(generateSlug('Article 123')).toBe('article-123');
      expect(generateSlug('2024 Review')).toBe('2024-review');
    });

    it('should preserve case when specified', () => {
      expect(generateSlug('Hello World', { lowercase: false })).toBe('Hello-World');
      expect(generateSlug('TEST Case', { lowercase: false })).toBe('TEST-Case');
    });
  });

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('hello-world')).toBe(true);
      expect(isValidSlug('test-123')).toBe(true);
      expect(isValidSlug('article')).toBe(true);
      expect(isValidSlug('2024-review')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(isValidSlug('Hello World')).toBe(false); // spaces
      expect(isValidSlug('hello_world')).toBe(false); // underscore
      expect(isValidSlug('hello@world')).toBe(false); // special char
      expect(isValidSlug('HELLO-WORLD')).toBe(false); // uppercase
      expect(isValidSlug('-hello')).toBe(false); // leading dash
      expect(isValidSlug('hello-')).toBe(false); // trailing dash
      expect(isValidSlug('hello--world')).toBe(false); // double dash
      expect(isValidSlug('')).toBe(false); // empty
    });
  });

  describe('ensureUniqueSlug', () => {
    it('should return original slug if unique', async () => {
      const checkUnique = async (slug: string) => !['existing-slug', 'another-slug'].includes(slug);
      const result = await ensureUniqueSlug('new-slug', checkUnique);
      expect(result).toBe('new-slug');
    });

    it('should append number if slug exists', async () => {
      const existingSlugs = ['test-slug', 'test-slug-1', 'test-slug-2'];
      const checkUnique = async (slug: string) => !existingSlugs.includes(slug);
      
      const result = await ensureUniqueSlug('test-slug', checkUnique);
      expect(result).toBe('test-slug-3');
    });

    it('should find next available number', async () => {
      const existingSlugs = ['article', 'article-1', 'article-3', 'article-4'];
      const checkUnique = async (slug: string) => !existingSlugs.includes(slug);
      
      const result = await ensureUniqueSlug('article', checkUnique);
      expect(result).toBe('article-2');
    });

    it('should respect maxAttempts', async () => {
      const checkUnique = async () => false; // Always returns false
      
      await expect(
        ensureUniqueSlug('test', checkUnique, 5)
      ).rejects.toThrow('Could not generate unique slug after 5 attempts');
    });

    it('should handle async validation', async () => {
      let callCount = 0;
      const checkUnique = async (slug: string) => {
        callCount++;
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return slug === 'test-3';
      };
      
      const result = await ensureUniqueSlug('test', checkUnique);
      expect(result).toBe('test-3');
      expect(callCount).toBe(4); // test, test-1, test-2, test-3
    });
  });

  describe('generateSlugFromTitle', () => {
    it('should generate SEO-friendly slugs', () => {
      expect(generateSlugFromTitle('10 Best Recipes for Summer')).toBe('10-best-recipes-for-summer');
      expect(generateSlugFromTitle('How to: Build a Website')).toBe('how-to-build-a-website');
    });

    it('should handle common words optionally', () => {
      const title = 'The Best of the Best';
      // Default behavior might keep common words
      expect(generateSlugFromTitle(title)).toBe('the-best-of-the-best');
    });

    it('should handle dates in titles', () => {
      expect(generateSlugFromTitle('Review 2024: Year in Review')).toBe('review-2024-year-in-review');
      expect(generateSlugFromTitle('March 15, 2024 Update')).toBe('march-15-2024-update');
    });

    it('should handle brand names and products', () => {
      expect(generateSlugFromTitle("McDonald's New Menu")).toBe('mcdonalds-new-menu');
      expect(generateSlugFromTitle('iPhone 15 Pro Review')).toBe('iphone-15-pro-review');
    });
  });
});