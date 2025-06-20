import { z, ZodError, ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Standard API validation utility
 * Validates request body against a Zod schema and returns appropriate error responses
 */
export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    // Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            error: 'Invalid JSON in request body',
            details: error instanceof Error ? error.message : 'Failed to parse JSON'
          },
          { status: 400 }
        )
      };
    }

    // Validate against schema
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      // Format Zod validation errors
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            error: 'Validation failed',
            details: formattedErrors
          },
          { status: 400 }
        )
      };
    }

    // Unknown error
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          error: 'An unexpected error occurred during validation'
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Common validation schemas that can be reused across APIs
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  }),
  
  // Sort order
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Date string
  dateString: z.string().datetime('Invalid date format'),
  
  // Non-empty string
  nonEmptyString: z.string().min(1, 'This field cannot be empty'),
  
  // Optional but non-empty string
  optionalNonEmptyString: z.string().min(1).optional().nullable(),
};

/**
 * Extract and validate pagination params from URL
 */
export function validatePaginationParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  
  const validated = commonSchemas.pagination.parse({ page, limit });
  const offset = (validated.page - 1) * validated.limit;
  
  return {
    page: validated.page,
    limit: validated.limit,
    offset
  };
}