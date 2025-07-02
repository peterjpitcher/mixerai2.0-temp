/**
 * Accessibility utilities for improving screen reader support
 * and semantic HTML usage throughout the application
 */

import { cn } from '@/lib/utils';

/**
 * Screen reader only styles
 * Visually hides content but keeps it available to screen readers
 */
export const srOnly = cn(
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
  '[clip:rect(0,0,0,0)]'
);

/**
 * Focus visible styles for keyboard navigation
 */
export const focusRing = cn(
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

/**
 * Skip to main content link styles
 */
export const skipLink = cn(
  srOnly,
  'focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4',
  'focus:bg-background focus:px-4 focus:py-2 focus:rounded-md',
  focusRing
);

/**
 * Announce to screen readers using ARIA live regions
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = srOnly;
  announcer.textContent = message;
  
  document.body.appendChild(announcer);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * Generate unique IDs for form fields and ARIA relationships
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate heading level based on context
 */
export function getHeadingLevel(depth: number): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  const level = Math.min(Math.max(1, depth), 6);
  return `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * ARIA label helpers
 */
export const ariaLabels = {
  close: 'Close',
  menu: 'Menu',
  navigation: 'Main navigation',
  search: 'Search',
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',
  required: 'Required field',
  optional: 'Optional field',
  expand: 'Expand',
  collapse: 'Collapse',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  page: (current: number, total: number) => `Page ${current} of ${total}`,
  results: (count: number) => `${count} result${count === 1 ? '' : 's'} found`,
  selected: (count: number) => `${count} item${count === 1 ? '' : 's'} selected`,
};

/**
 * Keyboard navigation helpers
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
};

/**
 * Handle keyboard navigation for lists and menus
 */
export function handleListKeyDown(
  event: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onIndexChange: (index: number) => void,
  onSelect?: (index: number) => void
) {
  switch (event.key) {
    case KEYS.ARROW_DOWN:
      event.preventDefault();
      onIndexChange((currentIndex + 1) % itemCount);
      break;
    case KEYS.ARROW_UP:
      event.preventDefault();
      onIndexChange((currentIndex - 1 + itemCount) % itemCount);
      break;
    case KEYS.HOME:
      event.preventDefault();
      onIndexChange(0);
      break;
    case KEYS.END:
      event.preventDefault();
      onIndexChange(itemCount - 1);
      break;
    case KEYS.ENTER:
    case KEYS.SPACE:
      event.preventDefault();
      if (onSelect) {
        onSelect(currentIndex);
      }
      break;
  }
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== KEYS.TAB) return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }
  
  container.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Semantic HTML role mappings
 */
export const semanticRoles = {
  navigation: 'navigation',
  main: 'main',
  complementary: 'complementary',
  contentinfo: 'contentinfo',
  banner: 'banner',
  search: 'search',
  form: 'form',
  region: 'region',
  article: 'article',
  section: 'section',
} as const;

/**
 * Create accessible table props
 */
export function getAccessibleTableProps(caption?: string) {
  return {
    role: 'table',
    'aria-label': caption,
  };
}

/**
 * Create accessible form field props
 */
export function getAccessibleFieldProps({
  label,
  error,
  required,
  description,
}: {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
}) {
  const id = generateId('field');
  const errorId = error ? `${id}-error` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  
  return {
    id,
    'aria-label': label,
    'aria-required': required,
    'aria-invalid': !!error,
    'aria-errormessage': errorId,
    'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    errorId,
    descriptionId,
  };
}