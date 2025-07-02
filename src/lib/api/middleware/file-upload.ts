import { NextRequest, NextResponse } from 'next/server';
import { validateFile, validateFileContent, FileValidationOptions } from '@/lib/validation/file-upload';

/**
 * Middleware for validating file uploads in API routes
 */
export function withFileUploadValidation(
  handler: (req: NextRequest, file: File) => Promise<NextResponse>,
  options: FileValidationOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }
      
      // Validate file
      const validationResult = validateFile(file, options);
      if (!validationResult.valid) {
        return NextResponse.json(
          { error: validationResult.error },
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
            { error: contentValidation.error },
            { status: 400 }
          );
        }
      }
      
      // Call the handler with the validated file
      return handler(req, file);
    } catch (error) {
      console.error('File upload validation error:', error);
      return NextResponse.json(
        { error: 'Failed to process file upload' },
        { status: 500 }
      );
    }
  };
}