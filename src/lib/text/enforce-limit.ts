import Graphemer from 'graphemer';

const splitter = new Graphemer();

/**
 * Normalizes text for length calculation by trimming and collapsing whitespace
 */
export function normaliseForLength(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Truncates text to a maximum number of grapheme clusters (user-perceived characters)
 * This correctly handles emojis, combining marks, and other complex Unicode
 */
export function truncateGraphemeSafe(
  input: string, 
  limit: number
): { 
  text: string; 
  truncated: boolean;
  originalLength: number;
  finalLength: number;
} {
  const clean = normaliseForLength(input);
  const graphemes = splitter.splitGraphemes(clean);
  const originalLength = graphemes.length;
  
  if (originalLength <= limit) {
    return { 
      text: clean, 
      truncated: false,
      originalLength,
      finalLength: originalLength
    };
  }
  
  const truncatedGraphemes = graphemes.slice(0, limit);
  return { 
    text: truncatedGraphemes.join(''), 
    truncated: true,
    originalLength,
    finalLength: limit
  };
}

/**
 * Removes common wrapper characters that AI models sometimes add
 */
export function stripAIWrappers(text: string): string {
  // Remove leading/trailing quotes, backticks, and markdown fences
  let cleaned = text;
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/g, '').replace(/\n?```$/g, '');
  
  // Remove leading and trailing quotes (single and double)
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '');
  
  return cleaned;
}

/**
 * Validates if text meets length constraints
 */
export function validateLength(
  text: string,
  maxLength?: number,
  minLength?: number
): {
  valid: boolean;
  error?: string;
  length: number;
} {
  const normalized = normaliseForLength(text);
  const graphemes = splitter.splitGraphemes(normalized);
  const length = graphemes.length;
  
  if (minLength !== undefined && length < minLength) {
    return {
      valid: false,
      error: `Minimum ${minLength} characters required (current: ${length})`,
      length
    };
  }
  
  if (maxLength !== undefined && length > maxLength) {
    return {
      valid: false,
      error: `Maximum ${maxLength} characters allowed (current: ${length})`,
      length
    };
  }
  
  return { valid: true, length };
}