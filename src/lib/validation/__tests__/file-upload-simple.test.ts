import {
  validateFile,
  validateFileContent,
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
      expect(result.error).toContain('File size exceeds the maximum allowed size of 5MB');
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
      expect(result.error).toContain('doesn\'t match file type');
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
      expect(sanitizeFileName('hello@world#2024.jpg')).toBe('hello-world-2024.jpg');
      expect(sanitizeFileName('test...file.png')).toBe('test.file.png');
    });

    it('should handle unicode characters', () => {
      const result = sanitizeFileName('café-münchen.jpg');
      expect(result).toMatch(/\.jpg$/);
      expect(result).not.toMatch(/[éü]/i);
      expect(sanitizeFileName('文件名.pdf')).toMatch(/\.pdf$/);
    });

    it('should preserve file extension', () => {
      expect(sanitizeFileName('My Document!!!.PDF')).toMatch(/\.pdf$/i);
      expect(sanitizeFileName('photo (1).JPEG')).toMatch(/photo-1\.jpeg$/i);
    });

    it('should handle files without extension', () => {
      expect(sanitizeFileName('README')).toBe('README');
      expect(sanitizeFileName('my-file')).toBe('my-file');
    });

    it('should ignore fake extensions introduced via path traversal', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('etc-passwd');
      expect(sanitizeFileName('..\\..\\windows/system32')).toBe('windows-system32');
    });

    it('should keep genuine extensions from the final segment only', () => {
      expect(sanitizeFileName('../../uploads/photo.final.JPG')).toBe('uploads-photo.final.jpg');
      expect(sanitizeFileName('nested/path/archive.tar.gz')).toBe('path-archive.tar.gz');
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
      const file = {
        type: 'image/svg+xml',
        text: async () => `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="blue" />
          </svg>
        `,
      } as unknown as File;
      
      const result = await validateFileContent(file, { allowSVG: true });
      expect(result.valid).toBe(true);
    });

    it('should reject SVG with script tags', async () => {
      const file = {
        type: 'image/svg+xml',
        text: async () => `
          <svg xmlns="http://www.w3.org/2000/svg">
            <script>alert('XSS')</script>
            <circle cx="50" cy="50" r="40" />
          </svg>
        `,
      } as unknown as File;
      
      const result = await validateFileContent(file, { allowSVG: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous content');
    });

    it('should reject SVG with event handlers', async () => {
      const file = {
        type: 'image/svg+xml',
        text: async () => `
          <svg xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" onclick="alert('XSS')" />
          </svg>
        `,
      } as unknown as File;
      
      const result = await validateFileContent(file, { allowSVG: true });
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
