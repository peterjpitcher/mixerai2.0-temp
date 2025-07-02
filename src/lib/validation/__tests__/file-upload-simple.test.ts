import {
  validateFile,
  validateSVGContent,
  sanitizeFileName,
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
} from '../file-upload';

describe('File Upload Validation - Simple', () => {
  describe('validateFile', () => {
    it('should accept valid avatar image', () => {
      const file = {
        name: 'avatar.jpg',
        type: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      };

      const result = validateFile(file, { category: 'avatar' });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized avatar', () => {
      const file = {
        name: 'large-avatar.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB, exceeds 5MB limit
      };

      const result = validateFile(file, { category: 'avatar' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5.0MB limit');
    });

    it('should reject invalid MIME type for avatar', () => {
      const file = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024,
      };

      const result = validateFile(file, { category: 'avatar' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject files with mismatched extension', () => {
      const file = {
        name: 'malicious.jpg.exe',
        type: 'image/jpeg',
        size: 1024,
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('extension mismatch');
    });

    it('should accept custom MIME types when specified', () => {
      const file = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 5 * 1024 * 1024,
      };

      const result = validateFile(file, {
        allowedMimeTypes: ['application/pdf'],
        maxSize: 10 * 1024 * 1024,
      });
      expect(result.valid).toBe(true);
    });

    it('should validate brand logo with SVG', () => {
      const file = {
        name: 'logo.svg',
        type: 'image/svg+xml',
        size: 10 * 1024, // 10KB
      };

      const result = validateFile(file, { category: 'brandLogo' });
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove special characters', () => {
      expect(sanitizeFileName('hello@world#2024.jpg')).toBe('helloworld2024.jpg');
      expect(sanitizeFileName('test...file.png')).toBe('test.file.png');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFileName('café-münchen.jpg')).toBe('caf-mnchen.jpg');
      expect(sanitizeFileName('文件名.pdf')).toBe('.pdf');
    });

    it('should preserve file extension', () => {
      expect(sanitizeFileName('My Document!!!.PDF')).toBe('My-Document.pdf');
      expect(sanitizeFileName('photo (1).JPEG')).toBe('photo-1.jpeg');
    });

    it('should handle files without extension', () => {
      expect(sanitizeFileName('README')).toBe('README');
      expect(sanitizeFileName('my-file')).toBe('my-file');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/\.jpg$/);
    });
  });

  describe('validateSVGContent', () => {
    it('should accept clean SVG content', async () => {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="blue" />
        </svg>
      `;
      const file = new File([svgContent], 'icon.svg', { type: 'image/svg+xml' });
      
      const result = await validateSVGContent(file);
      expect(result.valid).toBe(true);
    });

    it('should reject SVG with script tags', async () => {
      const maliciousSVG = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
          <circle cx="50" cy="50" r="40" />
        </svg>
      `;
      const file = new File([maliciousSVG], 'malicious.svg', { type: 'image/svg+xml' });
      
      const result = await validateSVGContent(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should reject SVG with event handlers', async () => {
      const svgWithEvents = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" onclick="alert('XSS')" />
        </svg>
      `;
      const file = new File([svgWithEvents], 'events.svg', { type: 'image/svg+xml' });
      
      const result = await validateSVGContent(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('File Size Limits', () => {
    it('should have appropriate size limits', () => {
      expect(FILE_SIZE_LIMITS.avatar).toBe(5 * 1024 * 1024);
      expect(FILE_SIZE_LIMITS.brandLogo).toBe(10 * 1024 * 1024);
      expect(FILE_SIZE_LIMITS.document).toBe(25 * 1024 * 1024);
      expect(FILE_SIZE_LIMITS.image).toBe(15 * 1024 * 1024);
    });
  });

  describe('Allowed MIME Types', () => {
    it('should have appropriate MIME types for avatars', () => {
      expect(ALLOWED_MIME_TYPES.avatar).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES.avatar).toContain('image/png');
      expect(ALLOWED_MIME_TYPES.avatar).not.toContain('image/svg+xml');
    });

    it('should allow SVG for brand logos', () => {
      expect(ALLOWED_MIME_TYPES.brandLogo).toContain('image/svg+xml');
    });

    it('should have document MIME types', () => {
      expect(ALLOWED_MIME_TYPES.document).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES.document).toContain('application/msword');
    });
  });
});