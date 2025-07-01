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
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  category?: keyof typeof FILE_SIZE_LIMITS;
  validateContent?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
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
    maxSize = FILE_SIZE_LIMITS[category],
    allowedMimeTypes = options.allowedMimeTypes || (category in ALLOWED_MIME_TYPES 
      ? [...ALLOWED_MIME_TYPES[category as keyof typeof ALLOWED_MIME_TYPES]] 
      : undefined),
    validateContent = true,
  } = options;

  // Validate file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds ${sizeMB}MB limit`,
    };
  }

  // Validate MIME type
  if (allowedMimeTypes && !allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // Validate file extension matches MIME type
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';
  
  if (file.type && MIME_TO_EXTENSION[file.type]) {
    const validExtensions = MIME_TO_EXTENSION[file.type];
    if (!validExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension ".${fileExtension}" doesn't match file type "${file.type}"`,
      };
    }
  }

  // Sanitize filename
  const sanitizedFileName = sanitizeFileName(file.name);
  
  // Check for dangerous patterns in filename
  if (containsDangerousPatterns(fileName)) {
    return {
      valid: false,
      error: 'Filename contains potentially dangerous patterns',
    };
  }

  return {
    valid: true,
    sanitizedFileName,
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
      };
    }
    
    try {
      const content = await file.text();
      if (containsDangerousPatterns(content)) {
        return {
          valid: false,
          error: 'SVG file contains potentially dangerous content',
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to validate SVG content',
      };
    }
  }

  // For other image types, basic validation is sufficient
  // In production, you'd want to use a proper image validation library
  // or service that can detect malformed images
  
  return { valid: true };
}

/**
 * Sanitizes a filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path components
  const baseName = fileName.split(/[/\\]/).pop() || fileName;
  
  // Replace dangerous characters
  let sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^\./, '_');
  
  // Ensure it has a valid extension
  const parts = sanitized.split('.');
  if (parts.length === 1) {
    sanitized += '.unknown';
  }
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = parts[parts.length - 1];
    const nameWithoutExt = parts.slice(0, -1).join('.');
    const maxNameLength = 250 - extension.length;
    sanitized = nameWithoutExt.substring(0, maxNameLength) + '.' + extension;
  }
  
  return sanitized;
}

/**
 * Checks if content contains dangerous patterns
 */
function containsDangerousPatterns(content: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(content));
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
        });
        return;
      }
      
      if (height < minHeight || height > maxHeight) {
        resolve({
          valid: false,
          error: `Image height must be between ${minHeight}px and ${maxHeight}px`,
        });
        return;
      }
      
      if (aspectRatio) {
        const ratio = width / height;
        if (ratio < aspectRatio.min || ratio > aspectRatio.max) {
          resolve({
            valid: false,
            error: `Image aspect ratio must be between ${aspectRatio.min}:1 and ${aspectRatio.max}:1`,
          });
          return;
        }
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image for dimension validation',
      });
    };
    
    img.src = url;
  });
}