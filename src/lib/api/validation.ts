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
  
  // Brand permissions
  brandPermission: z.object({
    brand_id: z.string().uuid(),
    role: z.enum(['admin', 'editor', 'viewer'])
  }),
  
  // Status enums
  contentStatus: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']),
  workflowStatus: z.enum(['active', 'inactive', 'archived']),
  
  // Content filters
  contentFilters: z.object({
    status: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']).optional(),
    brand_id: z.string().uuid().optional(),
    search: z.string().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }),
  
  // User reference
  userReference: z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    full_name: z.string().optional()
  }),
  
  // File upload
  fileUpload: z.object({
    filename: z.string().min(1),
    mimetype: z.string().min(1),
    size: z.number().positive().max(10 * 1024 * 1024) // 10MB max
  }),
  
  // Sort configuration
  sortConfig: z.object({
    column: z.string().min(1),
    direction: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // ID array
  idArray: z.array(z.string().uuid()).min(1),
  
  // Search query
  searchQuery: z.string().min(1).max(100),
  
  // Date range
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine(data => new Date(data.start) <= new Date(data.end), {
    message: "Start date must be before or equal to end date"
  }),
  
  // Workflow step
  workflowStep: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    order_index: z.number().int().min(0),
    assignees: z.array(z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      full_name: z.string().optional()
    })).min(1),
    role: z.string().optional(),
    approvalRequired: z.boolean().optional()
  }),
  
  // Batch operation
  batchOperation: z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(['delete', 'archive', 'restore', 'publish'])
  })
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