import {
  validateFile,
  validateMultipleFiles,
  isExecutableExtension,
  isSuspiciousFilename,
  getMimeTypeCategory,
} from '../file-upload';

describe('File Upload Validation', () => {
  describe('validateFile', () => {
    it('should accept valid image files', () => {
      const file = {
        name: 'test-image.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files exceeding size limit', () => {
      const file = {
        name: 'large-file.jpg',
        type: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB
      };

      const result = validateFile(file, { maxSizeMB: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds the maximum allowed size of 10MB');
    });

    it('should reject files with disallowed MIME types', () => {
      const file = {
        name: 'script.js',
        type: 'application/javascript',
        size: 1024,
      };

      const result = validateFile(file, { 
        allowedMimeTypes: ['image/jpeg', 'image/png'] 
      });
      expect(result.valid).toBe(false);
        expect(result.errors).toContain('File type application/javascript is not allowed');
    });

    it('should detect and reject executable files', () => {
      const executableFiles = [
        { name: 'virus.exe', type: 'application/octet-stream', size: 1024 },
        { name: 'script.bat', type: 'application/x-bat', size: 1024 },
        { name: 'shell.sh', type: 'application/x-sh', size: 1024 },
      ];

      executableFiles.forEach(file => {
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.includes('Executable files are not allowed'))).toBe(true);
      });
    });

    it('should detect suspicious filenames', () => {
      const suspiciousFiles = [
        { name: '.htaccess', type: 'text/plain', size: 1024 },
        { name: 'web.config', type: 'text/xml', size: 1024 },
        { name: '.env', type: 'text/plain', size: 1024 },
      ];

      suspiciousFiles.forEach(file => {
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.includes('Filename is potentially dangerous'))).toBe(true);
      });
    });

    it('should validate custom MIME types when provided', () => {
      const file = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024,
      };

      const result = validateFile(file, {
        allowedMimeTypes: ['application/pdf', 'application/msword']
      });
      expect(result.valid).toBe(true);
    });

    it('should reject empty files', () => {
      const file = {
        name: 'empty.txt',
        type: 'text/plain',
        size: 0,
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should sanitize filenames', () => {
      const file = {
        name: '../../../etc/passwd',
        type: 'text/plain',
        size: 1024,
      };

      const result = validateFile(file);
      expect(result.sanitizedFilename).toBe('etc-passwd');
    });

    it('should strip unsafe path characters from sanitized filename', () => {
      const file = {
        name: 'images/../avatar.png/../../evil.png/../malicious.gif',
        type: 'image/gif',
        size: 2048,
      } as { name: string; type: string; size: number };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename?.includes('/')).toBe(false);
      expect(result.sanitizedFilename?.includes('\\')).toBe(false);
    });
  });

  describe('validateMultipleFiles', () => {
    it('should validate multiple files independently', () => {
      const files = [
        { name: 'image1.jpg', type: 'image/jpeg', size: 1024 * 1024 },
        { name: 'image2.png', type: 'image/png', size: 2 * 1024 * 1024 },
        { name: 'virus.exe', type: 'application/octet-stream', size: 1024 },
      ];

      const result = validateMultipleFiles(files);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].valid).toBe(true);
      expect(result.results[1].valid).toBe(true);
      expect(result.results[2].valid).toBe(false);
      expect(result.allValid).toBe(false);
      expect(result.validCount).toBe(2);
    });

    it('should enforce total size limit', () => {
      const files = [
        { name: 'image1.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 },
        { name: 'image2.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 },
      ];

      const result = validateMultipleFiles(files, { maxTotalSizeMB: 25 });
      expect(result.allValid).toBe(false);
      expect(result.errors).toContain('Total file size (30MB) exceeds maximum allowed (25MB)');
    });

    it('should enforce maximum file count', () => {
      const files = Array(6).fill(null).map((_, i) => ({
        name: `image${i}.jpg`,
        type: 'image/jpeg',
        size: 1024,
      }));

      const result = validateMultipleFiles(files, { maxFiles: 5 });
      expect(result.allValid).toBe(false);
      expect(result.errors).toContain('Too many files. Maximum allowed: 5');
    });
  });

  describe('Helper Functions', () => {
    describe('isExecutableExtension', () => {
      it('should identify executable extensions', () => {
        expect(isExecutableExtension('.exe')).toBe(true);
        expect(isExecutableExtension('.bat')).toBe(true);
        expect(isExecutableExtension('.jpg')).toBe(false);
        expect(isExecutableExtension('.PDF')).toBe(false);
      });
    });

    describe('isSuspiciousFilename', () => {
      it('should identify suspicious filenames', () => {
        expect(isSuspiciousFilename('.htaccess')).toBe(true);
        expect(isSuspiciousFilename('web.config')).toBe(true);
        expect(isSuspiciousFilename('normal-file.txt')).toBe(false);
      });
    });

    describe('getMimeTypeCategory', () => {
      it('should categorize MIME types correctly', () => {
        expect(getMimeTypeCategory('image/jpeg')).toBe('image');
        expect(getMimeTypeCategory('application/pdf')).toBe('document');
        expect(getMimeTypeCategory('video/mp4')).toBe('video');
        expect(getMimeTypeCategory('text/plain')).toBe('text');
        expect(getMimeTypeCategory('application/octet-stream')).toBe('other');
      });
    });
  });
});
