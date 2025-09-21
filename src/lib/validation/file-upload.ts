import { z } from 'zod';

/**
 * File upload validation utilities
 * Provides comprehensive validation for file uploads including:
 * - File size limits
 * - MIME type validation
 * - File extension validation
 * - Content validation for specific file types
 * - Security checks
 */

// Maximum file sizes by category
export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5MB
  brandLogo: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  image: 15 * 1024 * 1024, // 15MB
  default: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES = {
  avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  brandLogo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// File extension mappings
const MIME_TO_EXTENSION: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/jpg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

// Dangerous file patterns to block
const DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /javascript:/i,
  /vbscript:/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
];

export interface FileValidationOptions {
  maxSize?: number;
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  category?: keyof typeof FILE_SIZE_LIMITS;
  validateContent?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errors: string[];
  sanitizedFileName?: string;
  sanitizedFilename?: string;
}

export interface MultiFileValidationResult {
  allValid: boolean;
  validCount: number;
  totalSize: number;
  errors: string[];
  results: FileValidationResult[];
}

/**
 * Validates a file upload
 */
export function validateFile(
  file: File | { name: string; type: string; size: number },
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    category = 'default',
    maxSize: explicitMaxSize,
    maxSizeMB,
    allowedMimeTypes = options.allowedMimeTypes || (category in ALLOWED_MIME_TYPES
      ? [...ALLOWED_MIME_TYPES[category as keyof typeof ALLOWED_MIME_TYPES]]
      : undefined),
    allowedExtensions,
    validateContent: _validateContent = true,
  } = options;

  const errors: string[] = [];
  const maxSize = explicitMaxSize ?? (typeof maxSizeMB === 'number' ? maxSizeMB * 1024 * 1024 : FILE_SIZE_LIMITS[category]);

  if (file.size === 0) {
    errors.push('File is empty');
  }

  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
    errors.push(`File size exceeds the maximum allowed size of ${sizeMB}MB`);
  }

  if (allowedMimeTypes && !allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';

  if (allowedExtensions && !allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension .${fileExtension} is not permitted`);
  }

  if (file.type && MIME_TO_EXTENSION[file.type]) {
    const validExtensions = MIME_TO_EXTENSION[file.type];
    if (!validExtensions.includes(fileExtension)) {
      errors.push(`File extension .${fileExtension} doesn't match file type ${file.type}`);
    }
  }

  const sanitizedFileName = sanitizeFileName(file.name);
  const sanitizedFilename = sanitizedFileName;
  
  if (containsDangerousPatterns(fileName)) {
    errors.push('Filename contains potentially dangerous patterns');
  }

  if (isExecutableExtension(fileExtension)) {
    errors.push('Executable files are not allowed');
  }

  if (isSuspiciousFilename(fileName)) {
    errors.push('Filename is potentially dangerous');
  }

  const valid = errors.length === 0;

  return {
    valid,
    error: errors[0],
    errors,
    sanitizedFileName,
    sanitizedFilename,
  };
}

/**
 * Validates file content for security issues
 */
export async function validateFileContent(
  file: File,
  options: { allowSVG?: boolean } = {}
): Promise<FileValidationResult> {
  const { allowSVG = false } = options;

  // Special handling for SVG files
  if (file.type === 'image/svg+xml') {
    if (!allowSVG) {
      return {
        valid: false,
        error: 'SVG files are not allowed due to security concerns',
        errors: ['SVG files are not allowed due to security concerns'],
      };
    }
    
    try {
      const content = await file.text();
      if (containsDangerousPatterns(content)) {
        return {
          valid: false,
          error: 'SVG file contains potentially dangerous content',
          errors: ['SVG file contains potentially dangerous content'],
        };
      }
    } catch (error) {
      console.error('Failed to validate SVG content:', error);
      return {
        valid: false,
        error: 'Failed to validate SVG content',
        errors: ['Failed to validate SVG content'],
      };
    }
  }

  // For other image types, basic validation is sufficient
  // In production, you'd want to use a proper image validation library
  // or service that can detect malformed images
  
  return { valid: true, errors: [] };
}

/**
 * Sanitizes a filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  const SAFE_FALLBACK = 'file';
  const normalizedInput = (fileName ?? '').replace(/\0/g, '').trim();

  const segments = normalizedInput.split(/[\\/]+/).filter(Boolean);
  const lastSegment = segments.length ? segments[segments.length - 1] : normalizedInput;
  const penultimateSegment = segments.length >= 2 ? segments[segments.length - 2] : '';

  const trimmedLastSegment = lastSegment.replace(/^\.+/, '') || lastSegment;
  const lastSegmentParts = trimmedLastSegment.split('.');
  const rawExtension = lastSegmentParts.length > 1 ? lastSegmentParts.pop()! : '';
  const sanitizedExtension = rawExtension.replace(/[^a-z0-9]/gi, '').toLowerCase();

  const baseCandidateSegments = [penultimateSegment, lastSegmentParts.join('.') || trimmedLastSegment]
    .filter(Boolean)
    .slice(-2);

  let baseCandidate = baseCandidateSegments.length
    ? baseCandidateSegments.join('-')
    : trimmedLastSegment || SAFE_FALLBACK;

  const sanitizeToken = (value: string) => {
    let token = value
      .replace(/\0/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-+(\.)/g, '$1')
      .trim();

    if (!token) {
      token = SAFE_FALLBACK;
    }

    return token;
  };

  baseCandidate = sanitizeToken(baseCandidate);

  const maxBaseLength = sanitizedExtension ? Math.max(1, 255 - sanitizedExtension.length - 1) : 255;
  if (baseCandidate.length > maxBaseLength) {
    baseCandidate = baseCandidate.substring(0, maxBaseLength);
    baseCandidate = baseCandidate.replace(/[-.]+$/, '');
    baseCandidate = baseCandidate || SAFE_FALLBACK;
  }

  if (!sanitizedExtension) {
    return baseCandidate.replace(/\.+$/, '') || SAFE_FALLBACK;
  }

  return `${baseCandidate}.${sanitizedExtension}`;
}

/**
 * Checks if content contains dangerous patterns
 */
function containsDangerousPatterns(content: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(content));
}

const EXECUTABLE_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'scr',
  'ps1',
  'sh',
  'bash',
  'csh',
  'ksh',
  'zsh',
  'reg',
  'vb',
  'js',
]);

const SUSPICIOUS_FILENAMES = new Set([
  '.htaccess',
  'web.config',
  '.env',
  '.gitignore',
  '.npmrc',
  '.yarnrc',
]);

export function isExecutableExtension(ext: string): boolean {
  const normalized = ext.replace(/^\./, '').toLowerCase();
  return EXECUTABLE_EXTENSIONS.has(normalized);
}

export function isSuspiciousFilename(name: string): boolean {
  const segments = name.split(/[/\\]+/).filter(Boolean);
  const normalized = (segments.pop() || name).trim().toLowerCase();
  return SUSPICIOUS_FILENAMES.has(normalized);
}

export function getMimeTypeCategory(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || mime === 'application/msword' || mime.includes('document')) return 'document';
  if (mime.startsWith('text/')) return 'text';
  return 'other';
}

export function validateMultipleFiles(
  files: Array<{ name: string; type: string; size: number }> = [],
  options: {
    maxFiles?: number;
    maxTotalSizeMB?: number;
    perFileOptions?: FileValidationOptions;
  } = {}
): MultiFileValidationResult {
  const { maxFiles, maxTotalSizeMB, perFileOptions } = options;
  const errors: string[] = [];

  if (maxFiles && files.length > maxFiles) {
    errors.push(`Too many files. Maximum allowed: ${maxFiles}`);
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (typeof maxTotalSizeMB === 'number') {
    const maxTotalBytes = maxTotalSizeMB * 1024 * 1024;
    if (totalSize > maxTotalBytes) {
      const totalMB = Math.round(totalSize / 1024 / 1024);
      errors.push(`Total file size (${totalMB}MB) exceeds maximum allowed (${maxTotalSizeMB}MB)`);
    }
  }

  const results = files.map((file) => validateFile(file, perFileOptions));
  const validResults = results.filter((result) => result.valid);

  return {
    allValid: errors.length === 0 && validResults.length === files.length,
    validCount: validResults.length,
    totalSize,
    errors,
    results,
  };
}

/**
 * Generates a unique filename with timestamp
 */
export function generateUniqueFileName(originalName: string, userId: string): string {
  const sanitized = sanitizeFileName(originalName);
  const parts = sanitized.split('.');
  const extension = parts.pop() || 'unknown';
  const nameWithoutExt = parts.join('.');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${userId}/${nameWithoutExt}-${timestamp}-${random}.${extension}`;
}

/**
 * Zod schema for file upload validation
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => validateFile(file).valid,
    (file) => ({ message: validateFile(file).error })
  ),
  category: z.enum(['avatar', 'brandLogo', 'image', 'document']).optional(),
});

/**
 * Creates a file validation schema with specific options
 */
export function createFileSchema(options: FileValidationOptions) {
  return z.instanceof(File).refine(
    (file) => validateFile(file, options).valid,
    (file) => ({ message: validateFile(file, options).error })
  );
}

/**
 * Validates image dimensions
 */
export async function validateImageDimensions(
  file: File,
  options: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: { min: number; max: number };
  } = {}
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const { width, height } = img;
      const {
        minWidth = 0,
        maxWidth = Infinity,
        minHeight = 0,
        maxHeight = Infinity,
        aspectRatio,
      } = options;
      
      if (width < minWidth || width > maxWidth) {
        resolve({
          valid: false,
          error: `Image width must be between ${minWidth}px and ${maxWidth}px`,
          errors: [`Image width must be between ${minWidth}px and ${maxWidth}px`],
        });
        return;
      }
      
      if (height < minHeight || height > maxHeight) {
        resolve({
          valid: false,
          error: `Image height must be between ${minHeight}px and ${maxHeight}px`,
          errors: [`Image height must be between ${minHeight}px and ${maxHeight}px`],
        });
        return;
      }
      
      if (aspectRatio) {
        const ratio = width / height;
        if (ratio < aspectRatio.min || ratio > aspectRatio.max) {
          resolve({
            valid: false,
            error: `Image aspect ratio must be between ${aspectRatio.min}:1 and ${aspectRatio.max}:1`,
            errors: [`Image aspect ratio must be between ${aspectRatio.min}:1 and ${aspectRatio.max}:1`],
          });
          return;
        }
      }
      
      resolve({ valid: true, errors: [] });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image for dimension validation',
        errors: ['Failed to load image for dimension validation'],
      });
    };
    
    img.src = url;
  });
}
