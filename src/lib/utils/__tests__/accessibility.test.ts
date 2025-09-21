import {
  srOnly,
  focusRing,
  getAriaLabel,
  getAriaDescribedBy,
  isScreenReaderActive,
  announceToScreenReader,
  skipLink,
  keyboardNavigation,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });

  describe('CSS Classes', () => {
    it('should provide screen reader only styles', () => {
      expect(srOnly).toContain('absolute');
      expect(srOnly).toContain('w-px');
      expect(srOnly).toContain('h-px');
      expect(srOnly).toContain('overflow-hidden');
    });

    it('should provide focus ring styles', () => {
      expect(focusRing).toContain('focus:outline-none');
      expect(focusRing).toContain('focus-visible:ring-2');
    });

    it('should provide skip link styles', () => {
      expect(skipLink).toContain('sr-only');
      expect(skipLink).toContain('focus:not-sr-only');
      expect(skipLink).toContain('focus:absolute');
    });

    it('should provide keyboard navigation styles', () => {
      expect(keyboardNavigation).toContain('focus:outline-none');
      expect(keyboardNavigation).toContain('focus-visible:ring-2');
      expect(keyboardNavigation).toContain('focus-visible:ring-offset-2');
    });
  });

  describe('ARIA Helpers', () => {
    describe('getAriaLabel', () => {
      it('should generate proper aria-label object', () => {
        const result = getAriaLabel('Test Label');
        expect(result).toEqual({ 'aria-label': 'Test Label' });
      });

      it('should handle empty labels', () => {
        const result = getAriaLabel('');
        expect(result).toEqual({});
      });

      it('should handle undefined labels', () => {
        const result = getAriaLabel(undefined);
        expect(result).toEqual({});
      });
    });

    describe('getAriaDescribedBy', () => {
      it('should generate proper aria-describedby for single ID', () => {
        const result = getAriaDescribedBy('desc-1');
        expect(result).toEqual({ 'aria-describedby': 'desc-1' });
      });

      it('should generate proper aria-describedby for multiple IDs', () => {
        const result = getAriaDescribedBy(['desc-1', 'desc-2', 'desc-3']);
        expect(result).toEqual({ 'aria-describedby': 'desc-1 desc-2 desc-3' });
      });

      it('should filter out empty IDs', () => {
        const result = getAriaDescribedBy(['desc-1', '', 'desc-2', undefined as any]);
        expect(result).toEqual({ 'aria-describedby': 'desc-1 desc-2' });
      });

      it('should return empty object for no valid IDs', () => {
        const result = getAriaDescribedBy([]);
        expect(result).toEqual({});
      });
    });
  });

  describe('Screen Reader Detection', () => {
    it('should detect screen reader from user agent', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Mock NVDA user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 NVDA/2023.1',
        configurable: true,
      });
      expect(isScreenReaderActive()).toBe(true);

      // Mock JAWS user agent  
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 JAWS/2023.1',
        configurable: true,
      });
      expect(isScreenReaderActive()).toBe(true);

      // Reset
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should return false for regular browsers', () => {
      expect(isScreenReaderActive()).toBe(false);
    });
  });

  describe('Screen Reader Announcements', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create aria-live region for announcements', () => {
      announceToScreenReader('Test message');
      
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('Test message');
    });

    it('should use assertive priority when specified', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('Urgent message');
    });

    it('should clean up announcement after delay', () => {
      announceToScreenReader('Temporary message');
      
      expect(document.querySelector('[aria-live]')).toBeTruthy();
      
      jest.advanceTimersByTime(1000);
      
      expect(document.querySelector('[aria-live]')).toBeFalsy();
    });

    it('should handle multiple announcements', () => {
      announceToScreenReader('First message');
      announceToScreenReader('Second message');
      
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions).toHaveLength(2);
    });
  });

  describe('Skip Link Component', () => {
    it('should generate skip link with proper attributes', () => {
      const container = document.createElement('div');
      const link = document.createElement('a');
      link.href = '#main';
      link.className = skipLink;
      link.textContent = 'Skip to content';
      container.appendChild(link);
      
      expect(link.className).toContain('sr-only');
      expect(link.className).toContain('focus:not-sr-only');
      expect(link.getAttribute('href')).toBe('#main');
    });
  });
});
