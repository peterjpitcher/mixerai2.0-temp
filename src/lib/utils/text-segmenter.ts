/**
 * Grapheme-safe text segmentation utilities
 * Handles emoji, diacritics, and other Unicode edge cases properly
 */
export class Segmenter {
  private intlSegmenter: Intl.Segmenter | null = null;

  constructor(locale: string = 'en') {
    // Check if Intl.Segmenter is available
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      this.intlSegmenter = new (Intl as any).Segmenter(locale, { granularity: 'grapheme' });
    }
  }

  /**
   * Truncate text to a maximum number of graphemes (visual characters)
   * Handles emoji, diacritics, and other complex Unicode properly
   */
  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Use Intl.Segmenter if available (most modern browsers)
    if (this.intlSegmenter) {
      const segments = Array.from(this.intlSegmenter.segment(text));
      if (segments.length <= maxLength) {
        return text;
      }
      
      return segments
        .slice(0, maxLength)
        .map(s => s.segment)
        .join('');
    }

    // Fallback: simple but imperfect truncation
    // This may break some emoji or diacritics, but better than nothing
    return this.fallbackTruncate(text, maxLength);
  }

  /**
   * Count the number of graphemes in a string
   */
  count(text: string): number {
    if (this.intlSegmenter) {
      return Array.from(this.intlSegmenter.segment(text)).length;
    }
    
    // Fallback: count code points (not perfect but better than .length)
    return Array.from(text).length;
  }

  /**
   * Fallback truncation when Intl.Segmenter is not available
   * Attempts to avoid breaking common emoji patterns
   */
  private fallbackTruncate(text: string, maxLength: number): string {
    // Convert to array of code points
    const codePoints = Array.from(text);
    
    if (codePoints.length <= maxLength) {
      return text;
    }

    // Truncate to max length
    let truncated = codePoints.slice(0, maxLength).join('');
    
    // Check if we might have broken an emoji sequence
    // Look for common emoji patterns at the end
    const lastChar = truncated[truncated.length - 1];
    const lastCodePoint = lastChar.codePointAt(0);
    
    if (lastCodePoint !== undefined) {
      // Check for high surrogate (potential broken emoji)
      if (lastCodePoint >= 0xD800 && lastCodePoint <= 0xDBFF) {
        // Remove the broken surrogate
        truncated = truncated.slice(0, -1);
      }
      
      // Check for zero-width joiner at the end
      if (lastChar === '\u200D') {
        // Remove the ZWJ and potentially broken sequence
        truncated = truncated.slice(0, -1);
      }
    }

    return truncated;
  }

  /**
   * Split text into lines, normalizing different line break styles
   */
  normalizeLineBreaks(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Count lines in text (after normalization)
   */
  countLines(text: string): number {
    const normalized = this.normalizeLineBreaks(text);
    return normalized.split('\n').length;
  }

  /**
   * Truncate text to a maximum number of lines
   */
  truncateLines(text: string, maxLines: number): string {
    const normalized = this.normalizeLineBreaks(text);
    const lines = normalized.split('\n');
    
    if (lines.length <= maxLines) {
      return normalized;
    }
    
    return lines.slice(0, maxLines).join('\n');
  }
}

// Export a singleton instance for convenience
export const textSegmenter = new Segmenter();