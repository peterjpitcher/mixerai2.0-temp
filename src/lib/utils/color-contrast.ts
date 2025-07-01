/**
 * Color contrast utilities for WCAG compliance
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate relative luminance of a color
 * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function meetsWCAGStandard(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  largeText: boolean = false
): boolean {
  if (level === 'AA') {
    return largeText ? ratio >= 3 : ratio >= 4.5;
  }
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get contrast ratio from color strings (hex or hsl)
 */
export function getContrastFromColors(
  color1: string,
  color2: string
): number | null {
  let rgb1, rgb2;

  // Parse color1
  if (color1.startsWith('#')) {
    rgb1 = hexToRgb(color1);
  } else if (color1.startsWith('hsl')) {
    const match = color1.match(/hsl\((\d+),?\s*(\d+)%,?\s*(\d+)%\)/);
    if (match) {
      rgb1 = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
  }

  // Parse color2
  if (color2.startsWith('#')) {
    rgb2 = hexToRgb(color2);
  } else if (color2.startsWith('hsl')) {
    const match = color2.match(/hsl\((\d+),?\s*(\d+)%,?\s*(\d+)%\)/);
    if (match) {
      rgb2 = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
  }

  if (!rgb1 || !rgb2) return null;

  return getContrastRatio(rgb1, rgb2);
}

/**
 * Determine best text color (black or white) for a given background
 */
export function getBestTextColor(backgroundColor: string): 'black' | 'white' {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  let bgRgb;
  
  if (backgroundColor.startsWith('#')) {
    bgRgb = hexToRgb(backgroundColor);
  } else if (backgroundColor.startsWith('hsl')) {
    const match = backgroundColor.match(/hsl\((\d+),?\s*(\d+)%,?\s*(\d+)%\)/);
    if (match) {
      bgRgb = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
  }
  
  if (!bgRgb) return 'white'; // Default to white if parsing fails
  
  const whiteContrast = getContrastRatio(bgRgb, white);
  const blackContrast = getContrastRatio(bgRgb, black);
  
  // Choose the color with better contrast, ensuring it meets WCAG AA
  if (whiteContrast >= 4.5 && whiteContrast > blackContrast) {
    return 'white';
  } else if (blackContrast >= 4.5) {
    return 'black';
  }
  
  // If neither meets AA, choose the better one
  return whiteContrast > blackContrast ? 'white' : 'black';
}

/**
 * Validate color contrast for WCAG compliance
 */
export interface ContrastValidation {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  meetsLargeTextAA: boolean;
  meetsLargeTextAAA: boolean;
  recommendation?: string;
}

export function validateColorContrast(
  foreground: string,
  background: string
): ContrastValidation | null {
  const ratio = getContrastFromColors(foreground, background);
  
  if (ratio === null) {
    return null;
  }
  
  const validation: ContrastValidation = {
    ratio: Math.round(ratio * 100) / 100,
    meetsAA: ratio >= 4.5,
    meetsAAA: ratio >= 7,
    meetsLargeTextAA: ratio >= 3,
    meetsLargeTextAAA: ratio >= 4.5,
  };
  
  if (!validation.meetsAA) {
    if (validation.meetsLargeTextAA) {
      validation.recommendation = 'This color combination only meets WCAG AA for large text (18pt+ or 14pt+ bold)';
    } else {
      validation.recommendation = 'This color combination does not meet WCAG AA standards. Consider adjusting the colors.';
    }
  }
  
  return validation;
}