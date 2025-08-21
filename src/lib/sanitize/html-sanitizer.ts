import DOMPurify from 'isomorphic-dompurify';

export interface FieldConfig {
  allow_images?: boolean;
  allow_videos?: boolean;
  allow_links?: boolean;
  allow_tables?: boolean;
  max_length?: number;
  max_rows?: number;
}

/**
 * Sanitizes HTML content based on field configuration
 * Removes disallowed tags and dangerous attributes
 */
export function sanitizeHTML(html: string, config: FieldConfig = {}): string {
  // Default to restrictive - security by default
  const {
    allow_images = false,
    allow_videos = false,
    allow_links = true,
    allow_tables = false
  } = config;

  // Build allowed tags list
  const ALLOWED_TAGS = [
    // Text formatting
    'p', 'br', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    
    // Lists
    'ul', 'ol', 'li',
    
    // Quotes and code
    'blockquote', 'pre', 'code',
    
    // Conditionally allowed
    ...(allow_links ? ['a'] : []),
    ...(allow_images ? ['img'] : []),
    ...(allow_videos ? ['video', 'iframe'] : []),
    ...(allow_tables ? ['table', 'thead', 'tbody', 'tr', 'td', 'th'] : [])
  ];

  // Allowed attributes per tag
  const ALLOWED_ATTR: string[] = [
    'class', 'style', 'id',
    // Links
    ...(allow_links ? ['href', 'target', 'rel'] : []),
    // Images
    ...(allow_images ? ['src', 'alt', 'width', 'height'] : []),
    // Videos
    ...(allow_videos ? ['src', 'controls', 'poster', 'width', 'height'] : [])
  ];

  // Configure DOMPurify
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: true,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    IN_PLACE: false
  });

  // Additional cleanup - remove event handlers
  const withoutEvents = cleanHTML.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  const withoutJSProtocol = withoutEvents.replace(/javascript:/gi, '');

  return withoutJSProtocol;
}

/**
 * Validates and sanitizes content before saving to database
 */
export function validateAndSanitizeContent(
  content: string,
  fieldConfig: FieldConfig
): { valid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  let sanitized = sanitizeHTML(content, fieldConfig);

  // Check max length if specified
  if (fieldConfig.max_length && sanitized.length > fieldConfig.max_length) {
    errors.push(`Content exceeds maximum length of ${fieldConfig.max_length} characters`);
    sanitized = sanitized.substring(0, fieldConfig.max_length);
  }

  // Check max rows if specified
  if (fieldConfig.max_rows) {
    const lineCount = (sanitized.match(/\n/g) || []).length + 1;
    if (lineCount > fieldConfig.max_rows) {
      errors.push(`Content exceeds maximum of ${fieldConfig.max_rows} rows`);
      // Truncate to max rows
      const lines = sanitized.split('\n');
      sanitized = lines.slice(0, fieldConfig.max_rows).join('\n');
    }
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
}