/**
 * UI/UX Standards and Constants
 * Based on WCAG 2.1 and modern accessibility best practices
 */

import { cn } from '@/lib/utils';

/**
 * Minimum touch target sizes as per WCAG 2.1 Level AA
 * - Default: 44x44px for primary interactive elements
 * - Inline: 24x24px for inline interactive elements with sufficient spacing
 */
export const TOUCH_TARGET_SIZES = {
  default: 'min-h-[44px] min-w-[44px]',
  inline: 'min-h-[24px] min-w-[24px]',
  large: 'min-h-[48px] min-w-[48px]',
} as const;

/**
 * Spacing standards for consistent UI
 */
export const SPACING = {
  xs: '0.5rem', // 8px
  sm: '1rem',   // 16px
  md: '1.5rem', // 24px
  lg: '2rem',   // 32px
  xl: '3rem',   // 48px
} as const;

/**
 * Focus indicator styles
 */
export const FOCUS_STYLES = {
  default: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  inset: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
  highContrast: 'focus:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2',
} as const;

/**
 * Animation durations respecting prefers-reduced-motion
 */
export const ANIMATION_DURATION = {
  instant: '0ms',
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
} as const;

/**
 * Z-index scale for consistent layering
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  notification: 700,
  commandPalette: 800,
} as const;

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Color contrast ratios
 */
export const CONTRAST_RATIOS = {
  AA: 4.5,  // Normal text
  AALarge: 3, // Large text (18pt or 14pt bold)
  AAA: 7,   // Enhanced contrast
  AAALarge: 4.5, // Enhanced contrast for large text
} as const;

/**
 * Touch-friendly class utilities
 */
export const touchTarget = {
  default: cn(TOUCH_TARGET_SIZES.default, 'flex items-center justify-center'),
  inline: cn(TOUCH_TARGET_SIZES.inline, 'inline-flex items-center justify-center'),
  large: cn(TOUCH_TARGET_SIZES.large, 'flex items-center justify-center'),
};

/**
 * Loading state classes
 */
export const loadingState = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  skeleton: 'bg-muted animate-pulse rounded',
};

/**
 * Disabled state classes
 */
export const disabledState = cn(
  'disabled:cursor-not-allowed disabled:opacity-50',
  'disabled:pointer-events-none'
);

/**
 * Interactive state classes
 */
export const interactiveState = cn(
  'transition-colors',
  'hover:bg-accent hover:text-accent-foreground',
  FOCUS_STYLES.default,
  'active:scale-[0.98]'
);

/**
 * Get appropriate text size based on viewport
 */
export function getResponsiveTextSize(base: string, sm?: string, md?: string, lg?: string) {
  return cn(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`
  );
}

/**
 * Ensure minimum clickable area for touch targets
 */
export function ensureTouchTarget(className?: string, size: keyof typeof TOUCH_TARGET_SIZES = 'default') {
  return cn(touchTarget[size], className);
}

/**
 * Apply consistent hover and focus states
 */
export function applyInteractiveStates(className?: string) {
  return cn(interactiveState, className);
}

/**
 * Typography scale for consistent text sizing
 */
export const TYPOGRAPHY = {
  display: 'text-4xl sm:text-5xl lg:text-6xl font-bold',
  h1: 'text-3xl sm:text-4xl font-bold',
  h2: 'text-2xl sm:text-3xl font-semibold',
  h3: 'text-xl sm:text-2xl font-semibold',
  h4: 'text-lg sm:text-xl font-medium',
  h5: 'text-base sm:text-lg font-medium',
  h6: 'text-sm sm:text-base font-medium',
  body: 'text-base',
  small: 'text-sm',
  caption: 'text-xs',
} as const;

/**
 * Common patterns for forms
 */
export const FORM_PATTERNS = {
  fieldSpacing: 'space-y-4',
  labelSpacing: 'mb-2',
  helpTextSpacing: 'mt-1',
  errorSpacing: 'mt-1',
  sectionSpacing: 'space-y-6',
} as const;

/**
 * Validation for touch target compliance
 */
export function validateTouchTarget(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // WCAG AA standard
  
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get appropriate focus style based on user preferences
 */
export function getFocusStyle(): string {
  return prefersHighContrast() ? FOCUS_STYLES.highContrast : FOCUS_STYLES.default;
}