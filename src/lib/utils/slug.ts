/**
 * URL/Slug generation utilities
 * Provides functions for creating SEO-friendly URLs and slugs
 */

/**
 * Generate a URL-friendly slug from text
 * @param text - The text to convert to a slug
 * @param options - Configuration options
 * @returns A URL-friendly slug
 */
export function generateSlug(
  text: string,
  options: {
    lowercase?: boolean;
    separator?: string;
    maxLength?: number;
    allowUnicode?: boolean;
  } = {}
): string {
  const {
    lowercase = true,
    separator = '-',
    maxLength,
    allowUnicode = false,
  } = options;

  let slug = text.trim();

  if (!allowUnicode) {
    // Convert to ASCII
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Replace spaces and special characters
  slug = slug
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, separator) // Replace spaces and underscores with separator
    .replace(new RegExp(`${separator}{2,}`, 'g'), separator) // Replace multiple separators
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), ''); // Trim separators

  if (lowercase) {
    slug = slug.toLowerCase();
  }

  if (maxLength && slug.length > maxLength) {
    // Truncate at word boundary
    slug = slug.substring(0, maxLength);
    const lastSeparator = slug.lastIndexOf(separator);
    if (lastSeparator > 0) {
      slug = slug.substring(0, lastSeparator);
    }
  }

  return slug;
}

/**
 * Generate a unique slug by appending a number if necessary
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function makeSlugUnique(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a slug with date prefix
 * @param text - The text to convert to a slug
 * @param date - The date to prefix (defaults to current date)
 * @returns A slug with date prefix (e.g., "2024-01-15-my-article")
 */
export function generateDateSlug(text: string, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}-${month}-${day}`;
  const slug = generateSlug(text);
  
  return `${datePrefix}-${slug}`;
}

/**
 * Extract slug from a full URL
 * @param url - The full URL
 * @returns The slug portion of the URL
 */
export function extractSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    // If not a valid URL, assume it's already a slug
    return url;
  }
}

/**
 * Validate if a string is a valid slug
 * @param slug - The string to validate
 * @returns Whether the string is a valid slug
 */
export function isValidSlug(slug: string): boolean {
  // Check if slug only contains allowed characters
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Generate a SEO-friendly article URL
 * @param baseUrl - The base URL of the site
 * @param category - The article category
 * @param slug - The article slug
 * @returns A complete article URL
 */
export function generateArticleUrl(
  baseUrl: string,
  category: string,
  slug: string
): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const categorySlug = generateSlug(category);
  
  return `${cleanBaseUrl}/articles/${categorySlug}/${slug}`;
}

/**
 * Generate meta title from article title
 * @param title - The article title
 * @param brandName - The brand name to append
 * @param maxLength - Maximum length for meta title (default: 60)
 * @returns A SEO-friendly meta title
 */
export function generateMetaTitle(
  title: string,
  brandName?: string,
  maxLength: number = 60
): string {
  let metaTitle = title;
  
  if (brandName) {
    const separator = ' | ';
    const brandSuffix = `${separator}${brandName}`;
    const availableLength = maxLength - brandSuffix.length;
    
    if (title.length > availableLength) {
      metaTitle = title.substring(0, availableLength - 3) + '...';
    }
    
    metaTitle += brandSuffix;
  } else if (title.length > maxLength) {
    metaTitle = title.substring(0, maxLength - 3) + '...';
  }
  
  return metaTitle;
}

/**
 * Common slug transformations for different content types
 */
export const slugPresets = {
  article: (title: string) => generateSlug(title, { maxLength: 100 }),
  product: (name: string) => generateSlug(name, { maxLength: 50 }),
  category: (name: string) => generateSlug(name, { maxLength: 30 }),
  tag: (name: string) => generateSlug(name, { maxLength: 25 }),
};