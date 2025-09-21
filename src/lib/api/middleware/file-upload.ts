import { NextRequest, NextResponse } from 'next/server';
import { validateFile, validateFileContent, FileValidationOptions } from '@/lib/validation/file-upload';

/**
 * Middleware for validating file uploads in API routes
 */
export function withFileUploadValidation(
  handler: (req: NextRequest, file: File, formData: FormData) => Promise<NextResponse>,
  options: FileValidationOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: 'No file provided',
            code: 'FILE_MISSING',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      
      // Validate file
      const validationResult = validateFile(file, options);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            success: false,
            error: validationResult.error || 'Invalid file',
            code: 'FILE_INVALID',
            details: validationResult.errors,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      
      // Validate file content if requested
      if (options.validateContent !== false) {
        const contentValidation = await validateFileContent(file, {
          allowSVG: options.category === 'brandLogo'
        });
        if (!contentValidation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: contentValidation.error || 'Invalid file content',
              code: 'FILE_CONTENT_INVALID',
              details: contentValidation.errors,
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
      }
      
      // Call the handler with the validated file and parsed form data
      return handler(req, file, formData);
    } catch (error) {
      console.error('File upload validation error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process file upload',
          code: 'FILE_UPLOAD_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}
